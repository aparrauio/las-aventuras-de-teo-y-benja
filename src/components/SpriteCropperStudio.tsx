import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  FlipHorizontal2,
  ImagePlus,
  Maximize2,
  RotateCw,
  ScanSearch,
  Scissors,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CropRect,
  SLOT_DEFINITIONS,
  SpriteAsset,
  SpriteSlotId,
  UploadedSheet,
} from '../types/game';
import {
  cropAndProcessImage,
  detectDrawingBoxes,
  fileToSheetData,
  loadImageElement,
} from '../utils/imageProcessing';

interface SpriteCropperStudioProps {
  sheets: UploadedSheet[];
  activeSheetId: string | null;
  selectedSlot: SpriteSlotId;
  sprites: Record<SpriteSlotId, SpriteAsset>;
  onSelectSheet: (id: string) => void;
  onAddSheets: (newSheets: UploadedSheet[]) => void;
  onDeleteSheet: (id: string) => void;
  onSelectSlot: (slotId: SpriteSlotId) => void;
  onSaveSprite: (sprite: SpriteAsset) => void;
  onGoToPlay: () => void;
}

type DragMode =
  | { type: 'none' }
  | { type: 'creating'; startX: number; startY: number }
  | { type: 'moving'; startX: number; startY: number; initialCrop: CropRect }
  | {
      type: 'resizing';
      handle: 'nw' | 'ne' | 'sw' | 'se';
      startX: number;
      startY: number;
      initialCrop: CropRect;
    };

export const SpriteCropperStudio: React.FC<SpriteCropperStudioProps> = ({
  sheets,
  activeSheetId,
  selectedSlot,
  sprites,
  onSelectSheet,
  onAddSheets,
  onDeleteSheet,
  onSelectSlot,
  onSaveSprite,
  onGoToPlay,
}) => {
  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0] || null,
    [sheets, activeSheetId]
  );

  const slotDef = useMemo(
    () => SLOT_DEFINITIONS.find((d) => d.id === selectedSlot) || SLOT_DEFINITIONS[0],
    [selectedSlot]
  );

  const [sheetImg, setSheetImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<CropRect[]>([]);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const [tolerance, setTolerance] = useState(34);
  const [removeInteriorWhites, setRemoveInteriorWhites] = useState(false);
  const [trimTransparent, setTrimTransparent] = useState(true);
  const [previewResult, setPreviewResult] = useState<{
    dataUrl: string;
    width: number;
    height: number;
  } | null>(null);

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragModeRef = useRef<DragMode>({ type: 'none' });
  const [stageSize, setStageSize] = useState({ width: 760, height: 500 });

  // Sync defaults when user picks a different destination slot
  useEffect(() => {
    setRemoveWhiteBg(slotDef.defaultRemoveBg);
    setTrimTransparent(slotDef.defaultTrim);
  }, [slotDef]);

  // Load HTMLImageElement when active sheet changes
  useEffect(() => {
    let cancelled = false;
    if (!activeSheet) {
      setSheetImg(null);
      setCrop(null);
      setDetectedBoxes([]);
      setPreviewResult(null);
      return;
    }

    loadImageElement(activeSheet.dataUrl)
      .then((img) => {
        if (cancelled) return;
        setSheetImg(img);
        setRotation(0);
        setFlipH(false);
        setDetectedBoxes([]);

        // Default initial selection: center 40% box so preview works immediately
        const defaultW = Math.round(img.naturalWidth * 0.36);
        const defaultH = Math.round(img.naturalHeight * 0.36);
        setCrop({
          x: Math.round((img.naturalWidth - defaultW) / 2),
          y: Math.round((img.naturalHeight - defaultH) / 2),
          width: defaultW,
          height: defaultH,
        });
      })
      .catch(() => {
        if (!cancelled) setSheetImg(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSheet]);

  // Measure responsive stage container
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compute fitted display geometry of sheet image inside stage
  const displayMetrics = useMemo(() => {
    if (!sheetImg) {
      return { scale: 1, offsetX: 0, offsetY: 0, drawW: 0, drawH: 0 };
    }
    const pad = 20;
    const availW = Math.max(120, stageSize.width - pad * 2);
    const availH = Math.max(120, stageSize.height - pad * 2);
    const scale = Math.min(availW / sheetImg.naturalWidth, availH / sheetImg.naturalHeight);
    const drawW = sheetImg.naturalWidth * scale;
    const drawH = sheetImg.naturalHeight * scale;
    const offsetX = (stageSize.width - drawW) / 2;
    const offsetY = (stageSize.height - drawH) / 2;
    return { scale, offsetX, offsetY, drawW, drawH };
  }, [sheetImg, stageSize]);

  // Live preview processing (debounced lightly for slider smoothness)
  useEffect(() => {
    if (!sheetImg || !crop || crop.width < 6 || crop.height < 6) {
      setPreviewResult(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const maxDim =
        selectedSlot === 'background' || selectedSlot === 'ground' || selectedSlot === 'cover'
          ? 1100
          : selectedSlot === 'cover_hero_1_name' || selectedSlot === 'cover_hero_2_name'
            ? 800
            : 520;
      const result = cropAndProcessImage(sheetImg, {
        crop,
        rotation,
        flipH,
        removeWhiteBg,
        tolerance,
        removeInteriorWhites,
        trimTransparent,
        maxDimension: maxDim,
      });
      setPreviewResult(result);
    }, 40);

    return () => window.clearTimeout(timer);
  }, [
    sheetImg,
    crop,
    rotation,
    flipH,
    removeWhiteBg,
    tolerance,
    removeInteriorWhites,
    trimTransparent,
    selectedSlot,
  ]);

  const handleFilesIncoming = useCallback(
    async (files: FileList | File[]) => {
      const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (valid.length === 0) return;

      setLoadingFiles(true);
      try {
        const created: UploadedSheet[] = [];
        for (const file of valid) {
          const processed = await fileToSheetData(file);
          created.push({
            id: `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            dataUrl: processed.dataUrl,
            width: processed.width,
            height: processed.height,
            createdAt: Date.now(),
          });
        }
        onAddSheets(created);
      } finally {
        setLoadingFiles(false);
      }
    },
    [onAddSheets]
  );

  const clientToImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = stageRef.current;
      if (!el || !sheetImg) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const ix = (px - displayMetrics.offsetX) / displayMetrics.scale;
      const iy = (py - displayMetrics.offsetY) / displayMetrics.scale;
      return {
        x: Math.max(0, Math.min(sheetImg.naturalWidth, ix)),
        y: Math.max(0, Math.min(sheetImg.naturalHeight, iy)),
      };
    },
    [sheetImg, displayMetrics]
  );

  const handlePointerDownStage = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetImg) return;
    if ((e.target as HTMLElement).dataset.ignoreStageDrag === 'true') return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = clientToImageCoords(e.clientX, e.clientY);
    dragModeRef.current = { type: 'creating', startX: pt.x, startY: pt.y };
    setCrop({ x: pt.x, y: pt.y, width: 1, height: 1 });
  };

  const handlePointerDownBox = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!crop) return;
    e.stopPropagation();
    stageRef.current?.setPointerCapture(e.pointerId);
    const pt = clientToImageCoords(e.clientX, e.clientY);
    dragModeRef.current = {
      type: 'moving',
      startX: pt.x,
      startY: pt.y,
      initialCrop: { ...crop },
    };
  };

  const handlePointerDownHandle = (
    e: React.PointerEvent<HTMLButtonElement>,
    handle: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    if (!crop) return;
    e.stopPropagation();
    stageRef.current?.setPointerCapture(e.pointerId);
    const pt = clientToImageCoords(e.clientX, e.clientY);
    dragModeRef.current = {
      type: 'resizing',
      handle,
      startX: pt.x,
      startY: pt.y,
      initialCrop: { ...crop },
    };
  };

  const handlePointerMoveStage = (e: React.PointerEvent<HTMLDivElement>) => {
    const mode = dragModeRef.current;
    if (mode.type === 'none' || !sheetImg) return;
    const pt = clientToImageCoords(e.clientX, e.clientY);
    const maxW = sheetImg.naturalWidth;
    const maxH = sheetImg.naturalHeight;

    if (mode.type === 'creating') {
      const x = Math.min(mode.startX, pt.x);
      const y = Math.min(mode.startY, pt.y);
      const width = Math.max(8, Math.abs(pt.x - mode.startX));
      const height = Math.max(8, Math.abs(pt.y - mode.startY));
      setCrop({ x, y, width, height });
    } else if (mode.type === 'moving') {
      const dx = pt.x - mode.startX;
      const dy = pt.y - mode.startY;
      const nx = Math.max(0, Math.min(maxW - mode.initialCrop.width, mode.initialCrop.x + dx));
      const ny = Math.max(0, Math.min(maxH - mode.initialCrop.height, mode.initialCrop.y + dy));
      setCrop({
        ...mode.initialCrop,
        x: nx,
        y: ny,
      });
    } else if (mode.type === 'resizing') {
      const { initialCrop, handle } = mode;
      let left = initialCrop.x;
      let top = initialCrop.y;
      let right = initialCrop.x + initialCrop.width;
      let bottom = initialCrop.y + initialCrop.height;

      const dx = pt.x - mode.startX;
      const dy = pt.y - mode.startY;
      const minSize = 18;

      if (handle.includes('w')) left = Math.min(right - minSize, Math.max(0, initialCrop.x + dx));
      if (handle.includes('e')) right = Math.max(left + minSize, Math.min(maxW, initialCrop.x + initialCrop.width + dx));
      if (handle.includes('n')) top = Math.min(bottom - minSize, Math.max(0, initialCrop.y + dy));
      if (handle.includes('s')) bottom = Math.max(top + minSize, Math.min(maxH, initialCrop.y + initialCrop.height + dy));

      setCrop({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      });
    }
  };

  const handlePointerUpStage = () => {
    dragModeRef.current = { type: 'none' };
  };

  const handleAutoDetect = () => {
    if (!sheetImg) return;
    const found = detectDrawingBoxes(sheetImg, tolerance);
    setDetectedBoxes(found);
    if (found.length > 0) {
      setCrop(found[0]);
    }
  };

  const handleSelectFullSheet = () => {
    if (!sheetImg) return;
    setCrop({
      x: 0,
      y: 0,
      width: sheetImg.naturalWidth,
      height: sheetImg.naturalHeight,
    });
  };

  const handleAssignToSlot = () => {
    if (!previewResult || !activeSheet) return;
    const asset: SpriteAsset = {
      slotId: selectedSlot,
      dataUrl: previewResult.dataUrl,
      width: previewResult.width,
      height: previewResult.height,
      isCustom: true,
      sourceSheetId: activeSheet.id,
      updatedAt: Date.now(),
    };
    onSaveSprite(asset);
    setSavedFeedback(`Guardado en "${slotDef.label}"`);
    window.setTimeout(() => setSavedFeedback(null), 2600);
  };

  const customCount = useMemo(
    () => Object.values(sprites).filter((s) => s.isCustom).length,
    [sprites]
  );

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFiles(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingFiles(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFiles(false);
        if (e.dataTransfer.files?.length) {
          handleFilesIncoming(e.dataTransfer.files);
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFilesIncoming(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Top Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Recortar dibujos escaneados
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Arrastra tus hojas completas aquí, encierra cada dibujo con el mouse y guárdalo en su lugar del juego.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {customCount} de {SLOT_DEFINITIONS.length} piezas personalizadas
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <ImagePlus className="h-4 w-4 text-slate-500" />
            Agregar hojas
          </button>
          <button
            type="button"
            onClick={onGoToPlay}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            Probar en el juego
          </button>
        </div>
      </div>

      {/* Uploaded Sheets Strip */}
      {sheets.length > 0 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {sheets.map((sheet, index) => {
            const isSelected = activeSheet?.id === sheet.id;
            return (
              <div
                key={sheet.id}
                className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors shrink-0 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSheet(sheet.id)}
                  className="flex items-center gap-2 text-left"
                >
                  <img
                    src={sheet.dataUrl}
                    alt={sheet.name}
                    className="h-8 w-8 rounded border border-slate-200 object-cover bg-white"
                  />
                  <span className="max-w-[140px] truncate text-xs font-medium">
                    {sheet.name || `Hoja ${index + 1}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSheet(sheet.id)}
                  title="Quitar esta hoja"
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Interactive Sheet Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {activeSheet ? (
            <>
              {/* Stage Action Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                  >
                    <ScanSearch className="h-3.5 w-3.5" />
                    Detectar dibujos
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectFullSheet}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                    Toda la hoja
                  </button>
                  {detectedBoxes.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {detectedBoxes.length} dibujos detectados · haz clic en uno para seleccionarlo
                    </span>
                  )}
                </div>

                {crop && (
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {Math.round(crop.width)} × {Math.round(crop.height)} px
                  </span>
                )}
              </div>

              {/* Canvas Viewport */}
              <div
                ref={stageRef}
                onPointerDown={handlePointerDownStage}
                onPointerMove={handlePointerMoveStage}
                onPointerUp={handlePointerUpStage}
                className={`relative h-[500px] w-full select-none overflow-hidden rounded-xl border bg-slate-100 touch-none ${
                  isDraggingFiles ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                }`}
              >
                {sheetImg && (
                  <>
                    <img
                      src={activeSheet.dataUrl}
                      alt={activeSheet.name}
                      draggable={false}
                      style={{
                        left: `${displayMetrics.offsetX}px`,
                        top: `${displayMetrics.offsetY}px`,
                        width: `${displayMetrics.drawW}px`,
                        height: `${displayMetrics.drawH}px`,
                      }}
                      className="pointer-events-none absolute max-w-none shadow-sm"
                    />

                    {/* Auto-detected clickable bounding boxes */}
                    {detectedBoxes.map((box, i) => {
                      const left = displayMetrics.offsetX + box.x * displayMetrics.scale;
                      const top = displayMetrics.offsetY + box.y * displayMetrics.scale;
                      const width = box.width * displayMetrics.scale;
                      const height = box.height * displayMetrics.scale;
                      const isCurrent =
                        crop &&
                        Math.abs(crop.x - box.x) < 4 &&
                        Math.abs(crop.y - box.y) < 4 &&
                        Math.abs(crop.width - box.width) < 4;

                      if (isCurrent) return null;

                      return (
                        <button
                          key={i}
                          type="button"
                          data-ignore-stage-drag="true"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setCrop({ ...box });
                          }}
                          style={{ left, top, width, height }}
                          className="absolute border-2 border-dashed border-amber-500/80 bg-amber-400/10 transition-colors hover:border-blue-600 hover:bg-blue-500/15"
                          title={`Seleccionar dibujo ${i + 1}`}
                        />
                      );
                    })}

                    {/* Active Crop Selection Rectangle */}
                    {crop && (
                      <div
                        onPointerDown={handlePointerDownBox}
                        style={{
                          left: `${displayMetrics.offsetX + crop.x * displayMetrics.scale}px`,
                          top: `${displayMetrics.offsetY + crop.y * displayMetrics.scale}px`,
                          width: `${crop.width * displayMetrics.scale}px`,
                          height: `${crop.height * displayMetrics.scale}px`,
                        }}
                        className="absolute cursor-move border-2 border-blue-600 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.38)]"
                      >
                        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                          const posClass =
                            corner === 'nw'
                              ? '-left-2 -top-2 cursor-nwse-resize'
                              : corner === 'ne'
                                ? '-right-2 -top-2 cursor-nesw-resize'
                                : corner === 'sw'
                                  ? '-left-2 -bottom-2 cursor-nesw-resize'
                                  : '-right-2 -bottom-2 cursor-nwse-resize';

                          return (
                            <button
                              key={corner}
                              type="button"
                              aria-label={`Ajustar esquina ${corner}`}
                              onPointerDown={(ev) => handlePointerDownHandle(ev, corner)}
                              className={`absolute h-4 w-4 rounded-sm border-2 border-blue-600 bg-white ${posClass}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {isDraggingFiles && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-600/15 backdrop-blur-[1px]">
                    <div className="rounded-xl border border-blue-300 bg-white px-6 py-4 text-sm font-semibold text-blue-700 shadow-lg">
                      Suelta aquí las hojas escaneadas (PNG o JPG)
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Arrastra sobre la hoja para encerrar cualquier dibujo, o usa <strong>Detectar dibujos</strong> para marcarlos automáticamente.
              </p>
            </>
          ) : (
            /* Empty Dropzone State */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-[500px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors ${
                isDraggingFiles
                  ? 'border-blue-600 bg-blue-50/70'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/60'
              }`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-blue-600">
                <Upload className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {loadingFiles ? 'Cargando imágenes...' : 'Arrastra aquí tus hojas escaneadas'}
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-slate-600">
                Acepta JPG, PNG o WEBP. Puedes subir páginas completas con varios dibujos juntos y recortarlos aquí uno por uno.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Elegir archivos de tu computadora
              </span>
            </button>
          )}
        </div>

        {/* Right: Preview + Cleanup + Assign to Game Slot */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Vista previa del recorte</h2>
            {previewResult && (
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {previewResult.width} × {previewResult.height}
              </span>
            )}
          </div>

          {/* Checkerboard Preview Box */}
          <div className="checkerboard-bg mb-5 flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 p-3">
            {previewResult ? (
              <img
                src={previewResult.dataUrl}
                alt="Vista previa recortada"
                className="max-h-full max-w-full object-contain drop-shadow-sm"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center text-xs text-slate-500">
                <Scissors className="h-5 w-5 text-slate-400" />
                <span>Sube una hoja y selecciona un dibujo</span>
              </div>
            )}
          </div>

          {/* Transform & Cleanup Controls */}
          <div className="space-y-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!previewResult}
                onClick={() => setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotar 90°
              </button>
              <button
                type="button"
                disabled={!previewResult}
                onClick={() => setFlipH((f) => !f)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                  flipH
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FlipHorizontal2 className="h-3.5 w-3.5" />
                Voltear ↔
              </button>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">Quitar fondo blanco</span>
              <input
                type="checkbox"
                checked={removeWhiteBg}
                onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            {removeWhiteBg && (
              <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Limpieza del papel</span>
                    <span className="font-mono text-slate-500 tabular-nums">{tolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={80}
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-2 text-xs text-slate-600">
                  <span>También quitar blancos cerrados (huecos)</span>
                  <input
                    type="checkbox"
                    checked={removeInteriorWhites}
                    onChange={(e) => setRemoveInteriorWhites(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-2 text-xs text-slate-600">
                  <span>Ajustar bordes transparentes</span>
                  <input
                    type="checkbox"
                    checked={trimTransparent}
                    onChange={(e) => setTrimTransparent(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Destination Slot Assignment */}
          <div className="pt-5">
            <label
              htmlFor="slot-select"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              ¿Para qué parte del juego es?
            </label>
            <select
              id="slot-select"
              value={selectedSlot}
              onChange={(e) => onSelectSlot(e.target.value as SpriteSlotId)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {(['hero', 'obstacles', 'rewards', 'decor', 'cover_art', 'world'] as const).map((cat) => {
                const items = SLOT_DEFINITIONS.filter((d) => d.category === cat);
                return (
                  <optgroup key={cat} label={items[0].categoryLabel}>
                    {items.map((def) => {
                      const hasCustom = sprites[def.id]?.isCustom;
                      return (
                        <option key={def.id} value={def.id}>
                          {hasCustom ? '✓ ' : ''}
                          {def.label}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </select>

            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {slotDef.hint} <span className="font-medium text-slate-700">{slotDef.recommendedOrientation}</span>
            </p>

            {/* Current sprite in selected slot */}
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <img
                src={sprites[selectedSlot]?.dataUrl}
                alt={slotDef.label}
                className="h-10 w-10 rounded border border-slate-200 bg-white object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-slate-800">{slotDef.label}</div>
                <div className="text-xs text-slate-500">
                  {sprites[selectedSlot]?.isCustom
                    ? 'Ya tiene un dibujo tuyo'
                    : 'Usa dibujo base temporal'}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!previewResult}
              onClick={handleAssignToSlot}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Check className="h-4 w-4" />
              Guardar en el juego
            </button>

            {savedFeedback && (
              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                <span>{savedFeedback}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
