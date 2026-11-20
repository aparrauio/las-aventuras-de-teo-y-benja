import { GameDifficulty, SpriteAsset, SpriteSlotId, UploadedSheet } from '../types/game';

const DB_NAME = 'kids_runner_workshop_db';
const DB_VERSION = 1;
const STORE_SHEETS = 'sheets';
const STORE_SPRITES = 'sprites';
const STORE_SETTINGS = 'settings';

export interface GameSettings {
  title: string;
  hero1Name: string;
  hero2Name: string;
  activeHero: '1' | '2';
  difficulty: GameDifficulty;
  highScore: number;
  muted: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  title: 'Las aventuras de Teo&Benja',
  hero1Name: 'Héroe 1',
  hero2Name: 'Héroe 2',
  activeHero: '1',
  difficulty: 'gentle',
  highScore: 0,
  muted: false,
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SHEETS)) {
        db.createObjectStore(STORE_SHEETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SPRITES)) {
        db.createObjectStore(STORE_SPRITES, { keyPath: 'slotId' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllSheets(): Promise<UploadedSheet[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SHEETS, 'readonly');
      const store = tx.objectStore(STORE_SHEETS);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as UploadedSheet[]) || [];
        rows.sort((a, b) => a.createdAt - b.createdAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveSheet(sheet: UploadedSheet): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SHEETS, 'readwrite');
    tx.objectStore(STORE_SHEETS).put(sheet);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSheetById(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SHEETS, 'readwrite');
    tx.objectStore(STORE_SHEETS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCustomSprites(): Promise<Partial<Record<SpriteSlotId, SpriteAsset>>> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SPRITES, 'readonly');
      const req = tx.objectStore(STORE_SPRITES).getAll();
      req.onsuccess = () => {
        const result: Partial<Record<SpriteSlotId, SpriteAsset>> = {};
        for (const item of (req.result as SpriteAsset[]) || []) {
          result[item.slotId] = item;
        }
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}

export async function saveCustomSprite(sprite: SpriteAsset): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SPRITES, 'readwrite');
    tx.objectStore(STORE_SPRITES).put(sprite);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCustomSprite(slotId: SpriteSlotId): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SPRITES, 'readwrite');
    tx.objectStore(STORE_SPRITES).delete(slotId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllCustomSprites(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SPRITES, 'readwrite');
    tx.objectStore(STORE_SPRITES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSettings(): Promise<GameSettings> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const req = tx.objectStore(STORE_SETTINGS).get('app_settings');
      req.onsuccess = () => {
        const found = req.result as { key: string; value: Partial<GameSettings> & { activeHero?: string } } | undefined;
        const merged = { ...DEFAULT_SETTINGS, ...(found?.value || {}) } as GameSettings;
        if (merged.title === 'Nuestra Aventura') {
          merged.title = 'Las aventuras de Teo&Benja';
        }
        if (merged.activeHero !== '1' && merged.activeHero !== '2') {
          merged.activeHero = '1';
        }
        resolve(merged);
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      tx.objectStore(STORE_SETTINGS).put({ key: 'app_settings', value: settings });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage quota errors gracefully
  }
}
