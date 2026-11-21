import { useCallback, useEffect, useMemo, useState } from 'react';
import { RunnerGameCanvas } from './components/RunnerGameCanvas';
import { GameDifficulty, SpriteAsset, SpriteSlotId } from './types/game';
import { getStarterSprites } from './utils/starterSprites';
import {
  GameSettings,
  loadCustomSprites,
  loadSettings,
  saveSettings,
} from './utils/storage';

export default function App() {
  const [starterSprites, setStarterSprites] = useState(() => getStarterSprites());
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

  // Hydrate persisted custom sprites and game settings from IndexedDB (and optional ./default-pack.json for GitHub Pages)
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

    Promise.all([loadCustomSprites(), loadSettings(), loadBundledPack()]).then(
      ([loadedSprites, loadedSettings, bundledPack]) => {
        if (cancelled) return;

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

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Cargando aventura...
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900">
      <main className="flex min-h-0 flex-1 flex-col">
        <RunnerGameCanvas
          sprites={mergedSprites}
          gameTitle={settings.title}
          hero1Name={settings.hero1Name}
          hero2Name={settings.hero2Name}
          activeHero={settings.activeHero}
          difficulty={settings.difficulty}
          highScore={settings.highScore}
          muted={settings.muted}
          onChangeActiveHero={(activeHero) => updateSettings({ activeHero })}
          onChangeDifficulty={(difficulty: GameDifficulty) => updateSettings({ difficulty })}
          onToggleMute={() => updateSettings({ muted: !settings.muted })}
          onUpdateHighScore={(highScore) => updateSettings({ highScore })}
        />
      </main>
    </div>
  );
}
