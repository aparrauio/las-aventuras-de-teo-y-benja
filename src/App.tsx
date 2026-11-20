import { useCallback, useEffect, useMemo, useState } from 'react';
import { RunnerGameCanvas } from './components/RunnerGameCanvas';
import { SpriteCropperStudio } from './components/SpriteCropperStudio';
import { SpriteGalleryView } from './components/SpriteGalleryView';
import { GameDifficulty, SpriteAsset, SpriteSlotId, UploadedSheet } from './types/game';
import { getStarterSprites } from './utils/starterSprites';
import {
  clearAllCustomSprites,
  deleteCustomSprite,
  deleteSheetById,
  GameSettings,
  loadAllSheets,
  loadCustomSprites,
  loadSettings,
  saveCustomSprite,
  saveSettings,
  saveSheet,
} from './utils/storage';

type AppTab = 'studio' | 'gallery' | 'play';

export default function App() {
  const [starterSprites, setStarterSprites] = useState(() => getStarterSprites());
  const [activeTab, setActiveTab] = useState<AppTab>('studio');
  const [sheets, setSheets] = useState<UploadedSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SpriteSlotId>('hero_run_1');
  const [customSprites, setCustomSprites] = useState<Partial<Record<SpriteSlotId, SpriteAsset>>>({});
  const [settings, setSettings] = useState<GameSettings>({
    title: 'Las aventuras de Teo&Benja',
    hero1Name: 'Héroe 1',
    hero2Name: 'Héroe 2',
    activeHero: '1',
    difficulty: 'gentle',
    highScore: 0,
    muted: false,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts
        .load('24px "Gloria Hallelujah"')
        .then(() => document.fonts.ready)
        .then(() => {
          if (!cancelled) {
            setStarterSprites(getStarterSprites(true));
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate persisted sheets, custom sprites, and game settings from IndexedDB (and optional ./default-pack.json for GitHub Pages)
  useEffect(() => {
    let cancelled = false;
    const loadBundledPack = async (): Promise<{
      sprites?: Partial<Record<SpriteSlotId, SpriteAsset>>;
      gameTitle?: string;
      hero1Name?: string;
      hero2Name?: string;
    } | null> => {
      try {
        const res = await fetch('./default-pack.json');
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
          return null;
        }
        const parsed = (await res.json()) as {
          sprites?: Partial<Record<SpriteSlotId, SpriteAsset>>;
          gameTitle?: string;
          hero1Name?: string;
          hero2Name?: string;
        };
        return parsed && parsed.sprites ? parsed : null;
      } catch {
        return null;
      }
    };

    Promise.all([loadAllSheets(), loadCustomSprites(), loadSettings(), loadBundledPack()]).then(
      ([loadedSheets, loadedSprites, loadedSettings, bundledPack]) => {
        if (cancelled) return;
        setSheets(loadedSheets);
        if (loadedSheets.length > 0) {
          setActiveSheetId(loadedSheets[loadedSheets.length - 1].id);
        }

        const mergedCustomSprites: Partial<Record<SpriteSlotId, SpriteAsset>> = {};
        if (bundledPack?.sprites) {
          for (const asset of Object.values(bundledPack.sprites)) {
            if (asset?.slotId && asset?.dataUrl) {
              mergedCustomSprites[asset.slotId] = { ...asset, isCustom: true };
            }
          }
        }
        Object.assign(mergedCustomSprites, loadedSprites);
        setCustomSprites(mergedCustomSprites);

        const nextSettings = { ...loadedSettings };
        if (bundledPack && Object.keys(loadedSprites).length === 0) {
          if (bundledPack.gameTitle) nextSettings.title = bundledPack.gameTitle;
          if (bundledPack.hero1Name) nextSettings.hero1Name = bundledPack.hero1Name;
          if (bundledPack.hero2Name) nextSettings.hero2Name = bundledPack.hero2Name;
          setActiveTab('play');
        }
        setSettings(nextSettings);
        setHydrated(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const mergedSprites = useMemo<Record<SpriteSlotId, SpriteAsset>>(() => {
    return {
      ...starterSprites,
      ...customSprites,
    };
  }, [starterSprites, customSprites]);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleAddSheets = useCallback(async (newSheets: UploadedSheet[]) => {
    for (const sheet of newSheets) {
      await saveSheet(sheet);
    }
    setSheets((prev) => [...prev, ...newSheets]);
    if (newSheets.length > 0) {
      setActiveSheetId(newSheets[newSheets.length - 1].id);
    }
  }, []);

  const handleDeleteSheet = useCallback(async (id: string) => {
    await deleteSheetById(id);
    setSheets((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      setActiveSheetId((curr) => (curr === id ? remaining[0]?.id ?? null : curr));
      return remaining;
    });
  }, []);

  const handleSaveSprite = useCallback(async (sprite: SpriteAsset) => {
    await saveCustomSprite(sprite);
    setCustomSprites((prev) => ({
      ...prev,
      [sprite.slotId]: sprite,
    }));
  }, []);

  const handleResetSlot = useCallback(async (slotId: SpriteSlotId) => {
    await deleteCustomSprite(slotId);
    setCustomSprites((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const handleResetAll = useCallback(async () => {
    await clearAllCustomSprites();
    setCustomSprites({});
  }, []);

  const handleImportPack = useCallback(
    async (
      imported: Partial<Record<SpriteSlotId, SpriteAsset>>,
      meta?: { title?: string; hero1Name?: string; hero2Name?: string }
    ) => {
      const entries = Object.values(imported).filter((item): item is SpriteAsset => Boolean(item?.slotId && item?.dataUrl));
      for (const sprite of entries) {
        await saveCustomSprite({ ...sprite, isCustom: true });
      }
      setCustomSprites((prev) => ({
        ...prev,
        ...imported,
      }));
      if (meta && (meta.title || meta.hero1Name || meta.hero2Name)) {
        updateSettings({
          ...(meta.title ? { title: meta.title } : {}),
          ...(meta.hero1Name ? { hero1Name: meta.hero1Name } : {}),
          ...(meta.hero2Name ? { hero2Name: meta.hero2Name } : {}),
        });
      }
    },
    [updateSettings]
  );

  const handleEditSlotInStudio = useCallback((slotId: SpriteSlotId) => {
    setSelectedSlot(slotId);
    setActiveTab('studio');
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Preparando taller...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('play')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Taller Endless Runner
          </button>

          {/* Zone 2: Clean Text Nav Links */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'studio'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Recortar dibujos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'gallery'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Piezas del juego
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('play')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'play'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Jugar
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            {activeTab === 'play' ? (
              <button
                type="button"
                onClick={() => setActiveTab('studio')}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Subir dibujos
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('play')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Jugar ahora
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {activeTab === 'studio' && (
          <SpriteCropperStudio
            sheets={sheets}
            activeSheetId={activeSheetId}
            selectedSlot={selectedSlot}
            sprites={mergedSprites}
            onSelectSheet={setActiveSheetId}
            onAddSheets={handleAddSheets}
            onDeleteSheet={handleDeleteSheet}
            onSelectSlot={setSelectedSlot}
            onSaveSprite={handleSaveSprite}
            onGoToPlay={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'gallery' && (
          <SpriteGalleryView
            sprites={mergedSprites}
            gameTitle={settings.title}
            hero1Name={settings.hero1Name}
            hero2Name={settings.hero2Name}
            onChangeHero1Name={(hero1Name) => updateSettings({ hero1Name })}
            onChangeHero2Name={(hero2Name) => updateSettings({ hero2Name })}
            onEditInStudio={handleEditSlotInStudio}
            onSaveSprite={handleSaveSprite}
            onResetSlot={handleResetSlot}
            onResetAll={handleResetAll}
            onImportPack={handleImportPack}
          />
        )}

        {activeTab === 'play' && (
          <RunnerGameCanvas
            sprites={mergedSprites}
            gameTitle={settings.title}
            hero1Name={settings.hero1Name}
            hero2Name={settings.hero2Name}
            activeHero={settings.activeHero}
            difficulty={settings.difficulty}
            highScore={settings.highScore}
            muted={settings.muted}
            onChangeTitle={(title) => updateSettings({ title })}
            onChangeActiveHero={(activeHero) => updateSettings({ activeHero })}
            onChangeDifficulty={(difficulty: GameDifficulty) => updateSettings({ difficulty })}
            onToggleMute={() => updateSettings({ muted: !settings.muted })}
            onUpdateHighScore={(highScore) => updateSettings({ highScore })}
            onOpenStudio={() => setActiveTab('studio')}
          />
        )}
      </main>
    </div>
  );
}
