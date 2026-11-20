import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, RotateCcw, Scissors, Upload } from 'lucide-react';
import { SLOT_DEFINITIONS, SpriteAsset, SpriteSlotId } from '../types/game';
import { cropAndProcessImage, fileToSheetData, loadImageElement } from '../utils/imageProcessing';

interface SpriteGalleryViewProps {
  sprites: Record<SpriteSlotId, SpriteAsset>;
  gameTitle: string;
  hero1Name: string;
  hero2Name: string;
  onChangeHero1Name: (name: string) => void;
  onChangeHero2Name: (name: string) => void;
  onEditInStudio: (slotId: SpriteSlotId) => void;
  onSaveSprite: (sprite: SpriteAsset) => void;
  onResetSlot: (slotId: SpriteSlotId) => void;
  onResetAll: () => void;
  onImportPack: (
    imported: Partial<Record<SpriteSlotId, SpriteAsset>>,
    meta?: { title?: string; hero1Name?: string; hero2Name?: string }
  ) => void;
}

export const SpriteGalleryView: React.FC<SpriteGalleryViewProps> = ({
  sprites,
  gameTitle,
  hero1Name,
  hero2Name,
  onChangeHero1Name,
  onChangeHero2Name,
  onEditInStudio,
  onSaveSprite,
  onResetSlot,
  onResetAll,
  onImportPack,
}) => {
  const [animFrame, setAnimFrame] = useState(0);
  const directUploadRef = useRef<HTMLInputElement | null>(null);
  const packInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSlot, setPendingSlot] = useState<SpriteSlotId | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setAnimFrame((f) => (f + 1) % 60);
    }, 135);
    return () => window.clearInterval(id);
  }, []);

  const handleDirectUpload = async (file: File, slotId: SpriteSlotId) => {
    const def = SLOT_DEFINITIONS.find((d) => d.id === slotId)!;
    const raw = await fileToSheetData(file);
    const img = await loadImageElement(raw.dataUrl);
    const maxDim =
      slotId === 'background' || slotId === 'ground' || slotId === 'cover' ? 1100 : 520;
    const processed = cropAndProcessImage(img, {
      crop: { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
      rotation: 0,
      flipH: false,
      removeWhiteBg: def.defaultRemoveBg,
      tolerance: 32,
      removeInteriorWhites: false,
      trimTransparent: def.defaultTrim,
      maxDimension: maxDim,
    });
    onSaveSprite({
      slotId,
      dataUrl: processed.dataUrl,
      width: processed.width,
      height: processed.height,
      isCustom: true,
      updatedAt: Date.now(),
    });
  };

  const handleExportPack = () => {
    const customOnly: Partial<Record<SpriteSlotId, SpriteAsset>> = {};
    for (const def of SLOT_DEFINITIONS) {
      if (sprites[def.id]?.isCustom) {
        customOnly[def.id] = sprites[def.id];
      }
    }
    const payload = {
      version: 1,
      gameTitle,
      hero1Name,
      hero2Name,
      exportedAt: new Date().toISOString(),
      sprites: customOnly,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gameTitle.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'mi-juego'}-dibujos.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPackFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        gameTitle?: string;
        hero1Name?: string;
        hero2Name?: string;
        sprites?: Partial<Record<SpriteSlotId, SpriteAsset>>;
      };
      if (!parsed.sprites || typeof parsed.sprites !== 'object') {
        setImportError('El archivo no contiene dibujos válidos.');
        return;
      }
      setImportError(null);
      onImportPack(parsed.sprites, {
        title: parsed.gameTitle,
        hero1Name: parsed.hero1Name,
        hero2Name: parsed.hero2Name,
      });
    } catch {
      setImportError('No se pudo leer el archivo del paquete.');
    }
  };

  const customCount = SLOT_DEFINITIONS.filter((d) => sprites[d.id]?.isCustom).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <input
        ref={directUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingSlot) {
            handleDirectUpload(file, pendingSlot);
          }
          e.target.value = '';
          setPendingSlot(null);
        }}
      />
      <input
        ref={packInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportPackFile(file);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Piezas del juego</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Revisa cada dibujo asignado, prueba cómo corre el protagonista y guarda o carga tu paquete.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPack}
            disabled={customCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar paquete
          </button>
          <button
            type="button"
            onClick={() => packInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar paquete
          </button>
          {customCount > 0 && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar todo
            </button>
          )}
        </div>
      </div>

      {importError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {importError}
        </div>
      )}

      {/* Hero Names & Live 5-Frame Walk Preview */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="checkerboard-bg flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 p-2">
                {(() => {
                  const hero1Slots: SpriteSlotId[] = [
                    'hero_run_1',
                    'hero_run_2',
                    'hero_run_3',
                    'hero_run_4',
                    'hero_run_5',
                  ];
                  const customFrames = hero1Slots.filter((id) => sprites[id]?.isCustom);
                  const activeFrames = customFrames.length > 0 ? customFrames : hero1Slots;
                  const currentSlot = activeFrames[animFrame % activeFrames.length];
                  return (
                    <img
                      src={sprites[currentSlot]?.dataUrl}
                      alt="Secuencia caminando del Héroe 1"
                      className="max-h-full max-w-full object-contain"
                    />
                  );
                })()}
              </div>
              <div className="checkerboard-bg flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 p-2">
                <img
                  src={sprites.hero_2?.dataUrl}
                  alt="Héroe 2"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Vista previa de los 2 héroes
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Héroe 1 anima su secuencia de 5 pasos; Héroe 2 usa su dibujo único.
              </p>
              <p className="mt-1.5 text-xs font-medium text-slate-500 tabular-nums">
                {customCount} dibujos propios · {SLOT_DEFINITIONS.length - customCount} dibujos base
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Nombres de los 2 protagonistas
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="gallery-hero-1-name"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Protagonista 1
              </label>
              <input
                id="gallery-hero-1-name"
                type="text"
                value={hero1Name}
                onChange={(e) => onChangeHero1Name(e.target.value)}
                maxLength={24}
                placeholder="Ej. Leo"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label
                htmlFor="gallery-hero-2-name"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Protagonista 2
              </label>
              <input
                id="gallery-hero-2-name"
                type="text"
                value={hero2Name}
                onChange={(e) => onChangeHero2Name(e.target.value)}
                maxLength={24}
                placeholder="Ej. Sofi"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categorized Grids */}
      {(['hero', 'obstacles', 'rewards', 'decor', 'cover_art', 'world'] as const).map((cat) => {
        const items = SLOT_DEFINITIONS.filter((d) => d.category === cat);
        return (
          <section key={cat} className="mb-8">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              {items[0].categoryLabel}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((def) => {
                const asset = sprites[def.id];
                return (
                  <div
                    key={def.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{def.label}</h3>
                        {asset?.isCustom ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0">
                            <Check className="h-3.5 w-3.5" />
                            Tuyo
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 shrink-0">Base</span>
                        )}
                      </div>

                      <div className="checkerboard-bg mb-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 p-2">
                        {asset ? (
                          <img
                            src={asset.dataUrl}
                            alt={def.label}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : null}
                      </div>

                      <p className="mb-4 text-xs leading-relaxed text-slate-500">{def.hint}</p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => onEditInStudio(def.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        Recortar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingSlot(def.id);
                          directUploadRef.current?.click();
                        }}
                        title="Subir imagen ya recortada"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                      {asset?.isCustom && (
                        <button
                          type="button"
                          onClick={() => onResetSlot(def.id)}
                          title="Volver al dibujo base"
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
