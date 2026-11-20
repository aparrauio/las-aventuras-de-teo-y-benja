import { CropRect } from '../types/game';

export interface ProcessCropOptions {
  crop: CropRect;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  removeWhiteBg: boolean;
  tolerance: number; // 0 - 100
  removeInteriorWhites: boolean;
  trimTransparent: boolean;
  maxDimension?: number;
}

export interface ProcessedResult {
  dataUrl: string;
  width: number;
  height: number;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function fileToSheetData(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await loadImageElement(rawUrl);
  // Cap huge scans at 2200px max dimension to keep cropper snappy and storage compact
  const maxSheetDim = 2200;
  const scale = Math.min(1, maxSheetDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  if (scale === 1 && file.type === 'image/png') {
    return { dataUrl: rawUrl, width: w, height: h };
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return {
    dataUrl: canvas.toDataURL(mime, 0.92),
    width: w,
    height: h,
  };
}

function isPaperPixel(r: number, g: number, b: number, a: number, tolerance: number): boolean {
  if (a < 20) return true;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const chroma = maxC - minC;

  const minLum = 250 - tolerance * 1.35;
  const maxChroma = 20 + tolerance * 0.45;
  return lum >= minLum && chroma <= maxChroma;
}

export function cropAndProcessImage(
  img: HTMLImageElement,
  options: ProcessCropOptions
): ProcessedResult {
  const {
    crop,
    rotation,
    flipH,
    removeWhiteBg,
    tolerance,
    removeInteriorWhites,
    trimTransparent,
    maxDimension = 640,
  } = options;

  const sx = Math.max(0, Math.round(crop.x));
  const sy = Math.max(0, Math.round(crop.y));
  const sw = Math.max(1, Math.min(img.naturalWidth - sx, Math.round(crop.width)));
  const sh = Math.max(1, Math.min(img.naturalHeight - sy, Math.round(crop.height)));

  const rotatedSwap = rotation === 90 || rotation === 270;
  const rawW = rotatedSwap ? sh : sw;
  const rawH = rotatedSwap ? sw : sh;

  const scale = Math.min(1, maxDimension / Math.max(rawW, rawH));
  const targetW = Math.max(1, Math.round(rawW * scale));
  const targetH = Math.max(1, Math.round(rawH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);
  if (flipH) {
    ctx.scale(-1, 1);
  }
  ctx.rotate((rotation * Math.PI) / 180);

  const drawW = rotatedSwap ? targetH : targetW;
  const drawH = rotatedSwap ? targetW : targetH;
  ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  if (removeWhiteBg) {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const total = targetW * targetH;
    const removed = new Uint8Array(total);

    if (removeInteriorWhites) {
      for (let i = 0; i < total; i++) {
        const idx = i * 4;
        if (isPaperPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], tolerance)) {
          data[idx + 3] = 0;
          removed[i] = 1;
        }
      }
    } else {
      // Border flood-fill preserves white areas inside closed outlines (eyes, teeth, shirts)
      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      let head = 0;
      let tail = 0;

      const tryPush = (px: number, py: number) => {
        if (px < 0 || py < 0 || px >= targetW || py >= targetH) return;
        const pos = py * targetW + px;
        if (visited[pos]) return;
        visited[pos] = 1;
        const idx = pos * 4;
        if (isPaperPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], tolerance)) {
          queue[tail++] = pos;
        }
      };

      for (let x = 0; x < targetW; x++) {
        tryPush(x, 0);
        tryPush(x, targetH - 1);
      }
      for (let y = 1; y < targetH - 1; y++) {
        tryPush(0, y);
        tryPush(targetW - 1, y);
      }

      while (head < tail) {
        const pos = queue[head++];
        removed[pos] = 1;
        data[pos * 4 + 3] = 0;
        const x = pos % targetW;
        const y = (pos - x) / targetW;
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
      }
    }

    // Gentle edge feathering on pixels adjacent to removed paper to prevent harsh white halos
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const pos = y * targetW + x;
        if (removed[pos]) continue;
        const hasRemovedNeighbor =
          removed[pos - 1] || removed[pos + 1] || removed[pos - targetW] || removed[pos + targetW];
        if (!hasRemovedNeighbor) continue;

        const idx = pos * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum > 185 && chroma < 38) {
          const fade = Math.max(0, Math.min(1, (245 - lum) / 70));
          data[idx + 3] = Math.round(data[idx + 3] * fade);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  if (trimTransparent) {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    let minX = targetW;
    let minY = targetH;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const alpha = data[(y * targetW + x) * 4 + 3];
        if (alpha > 16) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX >= minX && maxY >= minY) {
      const pad = 4;
      const tx = Math.max(0, minX - pad);
      const ty = Math.max(0, minY - pad);
      const tw = Math.min(targetW - tx, maxX - minX + 1 + pad * 2);
      const th = Math.min(targetH - ty, maxY - minY + 1 + pad * 2);

      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = tw;
      trimmedCanvas.height = th;
      const tctx = trimmedCanvas.getContext('2d')!;
      tctx.drawImage(canvas, tx, ty, tw, th, 0, 0, tw, th);

      return {
        dataUrl: trimmedCanvas.toDataURL('image/png'),
        width: tw,
        height: th,
      };
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: targetW,
    height: targetH,
  };
}

export function detectDrawingBoxes(img: HTMLImageElement, tolerance = 32): CropRect[] {
  const maxWork = 420;
  const scale = Math.min(1, maxWork / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h).data;
  const ink = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    if (!isPaperPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], tolerance)) {
      ink[i] = 1;
    }
  }

  // Dilate ink mask slightly so nearby strokes of one drawing merge together
  const dilateRadius = 4;
  const dilated = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ink[y * w + x]) continue;
      const x0 = Math.max(0, x - dilateRadius);
      const x1 = Math.min(w - 1, x + dilateRadius);
      const y0 = Math.max(0, y - dilateRadius);
      const y1 = Math.min(h - 1, y + dilateRadius);
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          dilated[ny * w + nx] = 1;
        }
      }
    }
  }

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const boxes: CropRect[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!dilated[start] || visited[start]) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      visited[start] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      while (head < tail) {
        const pos = queue[head++];
        count++;
        const cx = pos % w;
        const cy = (pos - cx) / w;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          cx + 1 < w ? pos + 1 : -1,
          cx - 1 >= 0 ? pos - 1 : -1,
          cy + 1 < h ? pos + w : -1,
          cy - 1 >= 0 ? pos - w : -1,
        ];
        for (const n of neighbors) {
          if (n >= 0 && dilated[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      // Ignore tiny speckles and full-page border frames
      if (count > 35 && bw >= 12 && bh >= 12 && !(bw > w * 0.96 && bh > h * 0.96)) {
        const pad = 6;
        const ox = Math.max(0, Math.round((minX - pad) / scale));
        const oy = Math.max(0, Math.round((minY - pad) / scale));
        const ow = Math.min(img.naturalWidth - ox, Math.round((bw + pad * 2) / scale));
        const oh = Math.min(img.naturalHeight - oy, Math.round((bh + pad * 2) / scale));
        boxes.push({ x: ox, y: oy, width: ow, height: oh });
      }
    }
  }

  // Sort left-to-right, top-to-bottom
  boxes.sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));
  return boxes.slice(0, 24);
}
