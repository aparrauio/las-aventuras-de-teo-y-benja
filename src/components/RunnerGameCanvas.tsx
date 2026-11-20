import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, Scissors, Volume2, VolumeX } from 'lucide-react';
import { GameDifficulty, GameState, SpriteAsset, SpriteSlotId } from '../types/game';
import { loadImageElement } from '../utils/imageProcessing';
import { soundFx } from '../utils/soundFx';

interface RunnerGameCanvasProps {
  sprites: Record<SpriteSlotId, SpriteAsset>;
  gameTitle: string;
  hero1Name: string;
  hero2Name: string;
  activeHero: '1' | '2';
  difficulty: GameDifficulty;
  highScore: number;
  muted: boolean;
  onChangeTitle: (title: string) => void;
  onChangeActiveHero: (hero: '1' | '2') => void;
  onChangeDifficulty: (diff: GameDifficulty) => void;
  onToggleMute: () => void;
  onUpdateHighScore: (score: number) => void;
  onOpenStudio: () => void;
}

interface ObstacleEntity {
  x: number;
  y: number;
  w: number;
  h: number;
  slotId: SpriteSlotId;
  isAir: boolean;
  passed: boolean;
}

interface DecorEntity {
  x: number;
  slotId: SpriteSlotId;
  w: number;
  h: number;
  speedFactor: number;
}

interface CollectibleEntity {
  x: number;
  y: number;
  r: number;
  kind: 'coin' | 'powerup';
  slotId: SpriteSlotId;
  collected: boolean;
  bobOffset: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface SkyEntity {
  x: number;
  y: number;
  scale: number;
  speedFactor: number;
}

const DIFFICULTY_CONFIG: Record<
  GameDifficulty,
  {
    label: string;
    subtitle: string;
    hearts: number;
    baseSpeed: number;
    maxSpeed: number;
    accel: number;
    gravity: number;
    jumpVel: number;
    minGap: number;
  }
> = {
  gentle: {
    label: 'Suave (5 años)',
    subtitle: '5 corazones · ritmo tranquilo',
    hearts: 5,
    baseSpeed: 290,
    maxSpeed: 440,
    accel: 3.5,
    gravity: 1650,
    jumpVel: -670,
    minGap: 360,
  },
  normal: {
    label: 'Normal (6–7 años)',
    subtitle: '3 corazones · divertido',
    hearts: 3,
    baseSpeed: 350,
    maxSpeed: 580,
    accel: 6,
    gravity: 1850,
    jumpVel: -710,
    minGap: 300,
  },
  brisk: {
    label: 'Rápido',
    subtitle: '3 corazones · más reto',
    hearts: 3,
    baseSpeed: 420,
    maxSpeed: 690,
    accel: 8.5,
    gravity: 2050,
    jumpVel: -750,
    minGap: 260,
  },
};

const CANVAS_W = 960;
const CANVAS_H = 480;
const GROUND_H = 84;
const GROUND_Y = CANVAS_H - GROUND_H;

const GROUND_OBSTACLE_SLOTS: SpriteSlotId[] = [
  'obstacle_ground_1',
  'obstacle_ground_2',
  'obstacle_ground_3',
  'obstacle_ground_4',
  'obstacle_ground_5',
  'obstacle_ground_6',
  'obstacle_ground_7',
];

const DECOR_SLOTS: SpriteSlotId[] = [
  'decor_1',
  'decor_2',
  'decor_3',
  'decor_4',
  'decor_5',
];

const COLLECTIBLE_SLOTS: SpriteSlotId[] = [
  'collectible',
  'collectible_2',
  'collectible_3',
  'collectible_4',
];

const HERO1_RUN_SLOTS: SpriteSlotId[] = [
  'hero_run_1',
  'hero_run_2',
  'hero_run_3',
  'hero_run_4',
  'hero_run_5',
];

export const RunnerGameCanvas: React.FC<RunnerGameCanvasProps> = ({
  sprites,
  gameTitle,
  hero1Name,
  hero2Name,
  activeHero,
  difficulty,
  highScore,
  muted,
  onChangeTitle,
  onChangeActiveHero,
  onChangeDifficulty,
  onToggleMute,
  onUpdateHighScore,
  onOpenStudio,
}) => {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [hudScore, setHudScore] = useState(0);
  const [hudStars, setHudStars] = useState(0);
  const [hudLives, setHudLives] = useState(DIFFICULTY_CONFIG[difficulty].hearts);
  const [hasShield, setHasShield] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [titleAnimFrame, setTitleAnimFrame] = useState(0);

  useEffect(() => {
    if (gameState !== 'TITLE_MENU') return;
    const id = window.setInterval(() => {
      setTitleAnimFrame((f) => (f + 1) % 60);
    }, 135);
    return () => window.clearInterval(id);
  }, [gameState]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<Partial<Record<SpriteSlotId, HTMLImageElement>>>({});
  const spritesRef = useRef(sprites);
  spritesRef.current = sprites;
  const activeHeroRef = useRef(activeHero);
  activeHeroRef.current = activeHero;
  const stateRef = useRef<GameState>('TITLE_MENU');
  stateRef.current = gameState;

  const worldRef = useRef({
    speed: DIFFICULTY_CONFIG[difficulty].baseSpeed,
    distance: 0,
    bonusPoints: 0,
    stars: 0,
    lives: DIFFICULTY_CONFIG[difficulty].hearts,
    maxLives: DIFFICULTY_CONFIG[difficulty].hearts,
    invulnTimer: 0,
    shieldTimer: 0,
    bgScroll: 0,
    groundScroll: 0,
    runAnimTimer: 0,
    runFrame: 0,
    hero2WalkPhase: 0,
    hero2TrailY: [] as number[],
    heroY: GROUND_Y - 90,
    heroVy: 0,
    jumpsUsed: 0,
    jumpBufferTimer: 0,
    spawnTimer: 1.1,
    collectibleTimer: 0.7,
    decorTimer: 0.6,
    powerupCooldown: 10,
    obstacles: [] as ObstacleEntity[],
    collectibles: [] as CollectibleEntity[],
    decorItems: [] as DecorEntity[],
    particles: [] as Particle[],
    popups: [] as FloatingText[],
    skyDecor: [
      { x: 180, y: 65, scale: 0.9, speedFactor: 0.18 },
      { x: 520, y: 110, scale: 0.7, speedFactor: 0.13 },
      { x: 820, y: 52, scale: 1.0, speedFactor: 0.22 },
    ] as SkyEntity[],
  });

  // Sync sound mute state
  useEffect(() => {
    soundFx.setMuted(muted);
  }, [muted]);

  // Preload sprite images whenever sprite map updates
  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(sprites) as [SpriteSlotId, SpriteAsset][];
    Promise.all(
      entries.map(async ([slotId, asset]) => {
        try {
          const img = await loadImageElement(asset.dataUrl);
          return [slotId, img] as const;
        } catch {
          return [slotId, undefined] as const;
        }
      })
    ).then((loaded) => {
      if (cancelled) return;
      const map: Partial<Record<SpriteSlotId, HTMLImageElement>> = {};
      for (const [id, img] of loaded) {
        if (img) map[id] = img;
      }
      loadedImagesRef.current = map;
    });
    return () => {
      cancelled = true;
    };
  }, [sprites]);

  const resetWorld = useCallback(
    (diff: GameDifficulty) => {
      const cfg = DIFFICULTY_CONFIG[diff];
      const w = worldRef.current;
      w.speed = cfg.baseSpeed;
      w.distance = 0;
      w.bonusPoints = 0;
      w.stars = 0;
      w.lives = cfg.hearts;
      w.maxLives = cfg.hearts;
      w.invulnTimer = 0;
      w.shieldTimer = 0;
      w.runAnimTimer = 0;
      w.runFrame = 0;
      w.hero2WalkPhase = 0;
      w.hero2TrailY = [];
      w.heroY = GROUND_Y - 90;
      w.heroVy = 0;
      w.jumpsUsed = 0;
      w.jumpBufferTimer = 0;
      w.spawnTimer = 1.1;
      w.collectibleTimer = 0.6;
      w.decorTimer = 0.4;
      w.powerupCooldown = 9;
      w.obstacles = [];
      w.collectibles = [];
      w.decorItems = [];
      w.particles = [];
      w.popups = [];

      setHudScore(0);
      setHudStars(0);
      setHudLives(cfg.hearts);
      setHasShield(false);
      setIsNewRecord(false);
    },
    []
  );

  const startGame = useCallback(() => {
    resetWorld(difficulty);
    setGameState('PLAYING');
  }, [difficulty, resetWorld]);

  const emitDust = (x: number, y: number, color: string, count: number) => {
    const w = worldRef.current;
    for (let i = 0; i < count; i++) {
      w.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: -80 - Math.random() * 120,
        vy: -30 - Math.random() * 90,
        life: 0.4 + Math.random() * 0.25,
        maxLife: 0.65,
        size: 5 + Math.random() * 6,
        color,
      });
    }
  };

  const triggerJump = useCallback(() => {
    if (stateRef.current === 'TITLE_MENU') {
      startGame();
      return;
    }
    if (stateRef.current !== 'PLAYING') return;

    const w = worldRef.current;
    const cfg = DIFFICULTY_CONFIG[difficulty];
    const heroH = 90;
    const onGround = w.heroY >= GROUND_Y - heroH - 2;

    if (onGround || w.jumpsUsed < 2) {
      const isDouble = !onGround && w.jumpsUsed === 1;
      w.heroVy = isDouble ? cfg.jumpVel * 0.92 : cfg.jumpVel;
      w.jumpsUsed = onGround ? 1 : 2;
      w.jumpBufferTimer = 0;
      soundFx.playJump(isDouble);
      emitDust(135, w.heroY + heroH - 6, isDouble ? '#93C5FD' : '#E2E8F0', 7);
    } else {
      // Buffer jump slightly before landing so 5-7yo timing feels snappy
      w.jumpBufferTimer = 0.14;
    }
  }, [difficulty, startGame]);

  // Keyboard controls (Space / ArrowUp / W to jump, P/Escape to pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (stateRef.current === 'GAME_OVER') {
          startGame();
        } else {
          triggerJump();
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (stateRef.current === 'PLAYING') setGameState('PAUSED');
        else if (stateRef.current === 'PAUSED') setGameState('PLAYING');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startGame, triggerJump]);

  // Main 60fps Game Loop & Renderer
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const drawSpriteFit = (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement | undefined,
      x: number,
      y: number,
      boxW: number,
      boxH: number,
      alignBottom = true
    ) => {
      if (!img) return;
      const ratio = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
      const dw = img.naturalWidth * ratio;
      const dh = img.naturalHeight * ratio;
      const dx = x + (boxW - dw) / 2;
      const dy = alignBottom ? y + (boxH - dh) : y + (boxH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const imgs = loadedImagesRef.current;
      const w = worldRef.current;
      const cfg = DIFFICULTY_CONFIG[difficulty];
      const heroX = 110;
      const heroW = 90;
      const heroH = 90;

      // Update simulation when PLAYING (and gentle idle scroll on TITLE_MENU)
      if (stateRef.current === 'TITLE_MENU') {
        w.bgScroll = (w.bgScroll + 36 * dt) % CANVAS_W;
        w.groundScroll = (w.groundScroll + 95 * dt) % 320;
        w.runAnimTimer += dt;
        w.hero2WalkPhase += dt * 10;
        if (w.runAnimTimer > 0.13) {
          w.runAnimTimer = 0;
          w.runFrame = (w.runFrame + 1) % 60;
        }
        for (const s of w.skyDecor) {
          s.x -= 45 * s.speedFactor * dt;
          if (s.x < -160) s.x = CANVAS_W + 100;
        }
        for (const d of w.decorItems) {
          d.x -= 60 * d.speedFactor * dt;
        }
        w.decorItems = w.decorItems.filter((d) => d.x + d.w > -40);
      } else if (stateRef.current === 'PLAYING') {
        w.speed = Math.min(cfg.maxSpeed, w.speed + cfg.accel * dt);
        w.distance += w.speed * dt * 0.08;
        w.bgScroll = (w.bgScroll + w.speed * 0.22 * dt) % CANVAS_W;

        const groundImg = imgs.ground;
        const groundTileW = groundImg
          ? Math.max(80, Math.round((groundImg.naturalWidth / groundImg.naturalHeight) * GROUND_H))
          : 320;
        w.groundScroll = (w.groundScroll + w.speed * dt) % groundTileW;

        for (const s of w.skyDecor) {
          s.x -= w.speed * s.speedFactor * dt;
          if (s.x < -180) {
            s.x = CANVAS_W + 80 + Math.random() * 140;
            s.y = 36 + Math.random() * 120;
          }
        }

        // Spawn and scroll landscape decorative objects (no collision)
        w.decorTimer -= dt;
        if (w.decorTimer <= 0) {
          const customDecor = DECOR_SLOTS.filter((id) => spritesRef.current[id]?.isCustom);
          const decorPool =
            customDecor.length > 0
              ? customDecor
              : spritesRef.current.background?.isCustom
                ? []
                : (['decor_1', 'decor_2'] as SpriteSlotId[]);
          if (decorPool.length > 0) {
            const chosenDecor = decorPool[Math.floor(Math.random() * decorPool.length)];
            const size = 76 + Math.round(Math.random() * 38);
            w.decorItems.push({
              x: CANVAS_W + 40,
              slotId: chosenDecor,
              w: size,
              h: size,
              speedFactor: 0.58 + Math.random() * 0.1,
            });
          }
          w.decorTimer = 1.4 + Math.random() * 1.6;
        }
        for (const d of w.decorItems) {
          d.x -= w.speed * d.speedFactor * dt;
        }
        w.decorItems = w.decorItems.filter((d) => d.x + d.w > -60);

        if (w.invulnTimer > 0) w.invulnTimer = Math.max(0, w.invulnTimer - dt);
        if (w.shieldTimer > 0) {
          w.shieldTimer = Math.max(0, w.shieldTimer - dt);
          if (w.shieldTimer === 0) setHasShield(false);
        }
        if (w.jumpBufferTimer > 0) w.jumpBufferTimer = Math.max(0, w.jumpBufferTimer - dt);

        // Hero physics
        w.heroVy += cfg.gravity * dt;
        w.heroY += w.heroVy * dt;
        if (w.heroY >= GROUND_Y - heroH) {
          if (w.heroVy > 220) {
            emitDust(heroX + heroW * 0.4, GROUND_Y - 4, '#CBD5E1', 4);
          }
          w.heroY = GROUND_Y - heroH;
          w.heroVy = 0;
          w.jumpsUsed = 0;

          if (w.jumpBufferTimer > 0) {
            w.heroVy = cfg.jumpVel;
            w.jumpsUsed = 1;
            w.jumpBufferTimer = 0;
            soundFx.playJump(false);
            emitDust(heroX + heroW * 0.4, GROUND_Y - 4, '#E2E8F0', 6);
          }
        }

        // Run animation cadence scales gently with speed (5-frame Hero 1 walk + Hero 2 bounce)
        w.hero2TrailY.push(w.heroY);
        if (w.hero2TrailY.length > 8) w.hero2TrailY.shift();
        w.hero2WalkPhase += dt * (11 + (w.speed - cfg.baseSpeed) * 0.015);
        w.runAnimTimer += dt;
        const frameInterval = Math.max(0.07, 0.145 - (w.speed - cfg.baseSpeed) * 0.00014);
        if (w.runAnimTimer >= frameInterval) {
          w.runAnimTimer = 0;
          w.runFrame = (w.runFrame + 1) % 60;
        }

        // Spawn obstacles from custom pool (or starter pool if none uploaded yet)
        w.spawnTimer -= dt;
        if (w.spawnTimer <= 0) {
          const totalScore = Math.floor(w.distance + w.bonusPoints);
          const customGround = GROUND_OBSTACLE_SLOTS.filter((id) => spritesRef.current[id]?.isCustom);
          const groundPool =
            customGround.length > 0
              ? customGround
              : (['obstacle_ground_1', 'obstacle_ground_2'] as SpriteSlotId[]);

          const allowAir = totalScore > 75 || Boolean(spritesRef.current.obstacle_air?.isCustom && totalScore > 30);
          const isAir = allowAir && Math.random() > 0.76;
          const slotId = isAir
            ? 'obstacle_air'
            : groundPool[Math.floor(Math.random() * groundPool.length)];

          const obsW = isAir ? 78 : 68;
          const obsH = isAir ? 60 : slotId === 'obstacle_ground_2' ? 74 : 66;
          const obsY = isAir ? GROUND_Y - 155 : GROUND_Y - obsH;

          w.obstacles.push({
            x: CANVAS_W + 40,
            y: obsY,
            w: obsW,
            h: obsH,
            slotId,
            isAir,
            passed: false,
          });

          const pickCollectibleSlot = (): SpriteSlotId => {
            const customPrizes = COLLECTIBLE_SLOTS.filter((id) => spritesRef.current[id]?.isCustom);
            const pool = customPrizes.length > 0 ? customPrizes : (['collectible'] as SpriteSlotId[]);
            return pool[Math.floor(Math.random() * pool.length)];
          };

          // Place a guiding arc of 3 stars/prizes above ground obstacles!
          if (!isAir && Math.random() > 0.35) {
            const arcSlot = pickCollectibleSlot();
            for (let i = -1; i <= 1; i++) {
              w.collectibles.push({
                x: CANVAS_W + 40 + obsW / 2 + i * 44,
                y: GROUND_Y - obsH - (i === 0 ? 85 : 58),
                r: 22,
                kind: 'coin',
                slotId: arcSlot,
                collected: false,
                bobOffset: Math.random() * Math.PI * 2,
              });
            }
          }

          const minTime = cfg.minGap / w.speed;
          w.spawnTimer = minTime + Math.random() * 0.75;
        }

        // Spawn standalone ground collectibles or powerups
        w.collectibleTimer -= dt;
        w.powerupCooldown -= dt;
        if (w.collectibleTimer <= 0) {
          const customPrizes = COLLECTIBLE_SLOTS.filter((id) => spritesRef.current[id]?.isCustom);
          const prizePool = customPrizes.length > 0 ? customPrizes : (['collectible'] as SpriteSlotId[]);

          if (w.powerupCooldown <= 0 && (w.lives < w.maxLives || Math.random() > 0.5)) {
            w.collectibles.push({
              x: CANVAS_W + 60,
              y: GROUND_Y - 130,
              r: 25,
              kind: 'powerup',
              slotId: 'powerup',
              collected: false,
              bobOffset: 0,
            });
            w.powerupCooldown = 12 + Math.random() * 6;
          } else {
            const count = 2 + Math.floor(Math.random() * 2);
            const high = Math.random() > 0.5;
            for (let i = 0; i < count; i++) {
              const slotId = prizePool[Math.floor(Math.random() * prizePool.length)];
              w.collectibles.push({
                x: CANVAS_W + 40 + i * 46,
                y: high ? GROUND_Y - 135 : GROUND_Y - 46,
                r: 21,
                kind: 'coin',
                slotId,
                collected: false,
                bobOffset: i * 0.7,
              });
            }
          }
          w.collectibleTimer = 1.6 + Math.random() * 1.2;
        }

        // Forgiving inner hero hitbox
        const hx = heroX + 18;
        const hy = w.heroY + 14;
        const hw = heroW - 36;
        const hh = heroH - 22;

        // Update obstacles & check collisions
        for (const obs of w.obstacles) {
          obs.x -= w.speed * dt;
          const ox = obs.x + 12;
          const oy = obs.y + 10;
          const ow = obs.w - 24;
          const oh = obs.h - 16;

          const hit = hx < ox + ow && hx + hw > ox && hy < oy + oh && hy + hh > oy;
          if (hit && w.invulnTimer <= 0) {
            if (w.shieldTimer > 0) {
              // Shield absorbs hit cleanly!
              w.shieldTimer = 0;
              setHasShield(false);
              w.invulnTimer = 1.1;
              obs.passed = true;
              emitDust(obs.x + obs.w / 2, obs.y + obs.h / 2, '#60A5FA', 12);
              w.popups.push({
                x: heroX + 40,
                y: w.heroY - 10,
                text: '¡Escudo!',
                life: 0.9,
                color: '#2563EB',
              });
              soundFx.playPowerup();
            } else {
              w.lives -= 1;
              setHudLives(w.lives);
              w.invulnTimer = 1.6;
              emitDust(heroX + heroW / 2, w.heroY + heroH / 2, '#FCA5A5', 10);
              soundFx.playHurt();

              if (w.lives <= 0) {
                const finalScore = Math.floor(w.distance + w.bonusPoints);
                const beat = finalScore > highScore && finalScore > 0;
                if (beat) {
                  onUpdateHighScore(finalScore);
                  setIsNewRecord(true);
                }
                soundFx.playGameOver(beat);
                setGameState('GAME_OVER');
              }
            }
          }
        }
        w.obstacles = w.obstacles.filter((o) => o.x + o.w > -60);

        // Update collectibles (generous pickup radius!)
        for (const col of w.collectibles) {
          col.x -= w.speed * dt;
          if (col.collected) continue;

          const cx = heroX + heroW / 2;
          const cy = w.heroY + heroH / 2;
          const dx = cx - col.x;
          const dy = cy - col.y;
          const reach = col.r + 42;
          if (dx * dx + dy * dy <= reach * reach) {
            col.collected = true;
            if (col.kind === 'powerup') {
              w.shieldTimer = 6.5;
              setHasShield(true);
              if (w.lives < w.maxLives) {
                w.lives += 1;
                setHudLives(w.lives);
              }
              w.bonusPoints += 25;
              soundFx.playPowerup();
              emitDust(col.x, col.y, '#F472B6', 12);
              w.popups.push({
                x: col.x,
                y: col.y - 12,
                text: '+Escudo!',
                life: 1.0,
                color: '#DB2777',
              });
            } else {
              w.stars += 1;
              w.bonusPoints += 10;
              setHudStars(w.stars);
              soundFx.playCollect();
              emitDust(col.x, col.y, '#FACC15', 7);
              w.popups.push({
                x: col.x,
                y: col.y - 10,
                text: '+10',
                life: 0.75,
                color: '#D97706',
              });
            }
          }
        }
        w.collectibles = w.collectibles.filter((c) => !c.collected && c.x > -60);

        // Update particles & floating popups
        for (const p of w.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 260 * dt;
          p.life -= dt;
        }
        w.particles = w.particles.filter((p) => p.life > 0);

        for (const pop of w.popups) {
          pop.y -= 45 * dt;
          pop.life -= dt;
        }
        w.popups = w.popups.filter((pop) => pop.life > 0);

        setHudScore(Math.floor(w.distance + w.bonusPoints));
      }

      // --- RENDER SCENE ---
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 1. Background parallax
      const bgImg = imgs.background;
      if (bgImg) {
        const bgW = Math.max(CANVAS_W, Math.round((bgImg.naturalWidth / bgImg.naturalHeight) * CANVAS_H));
        const shift = w.bgScroll % bgW;
        ctx.drawImage(bgImg, -shift, 0, bgW, CANVAS_H);
        ctx.drawImage(bgImg, bgW - shift, 0, bgW, CANVAS_H);
      } else {
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // 2. Sky decor parallax
      const skyImg = imgs.sky_decor;
      if (skyImg) {
        for (const s of w.skyDecor) {
          drawSpriteFit(ctx, skyImg, s.x, s.y, 120 * s.scale, 70 * s.scale, false);
        }
      }

      // 2b. Landscape decorative objects behind the hero & ground line
      for (const d of w.decorItems) {
        const dImg = imgs[d.slotId];
        if (dImg) {
          ctx.save();
          ctx.globalAlpha = 0.92;
          drawSpriteFit(ctx, dImg, d.x, GROUND_Y - d.h + 4, d.w, d.h, true);
          ctx.restore();
        }
      }

      // 3. Repeating infinite ground
      const groundImg = imgs.ground;
      if (groundImg) {
        const tileW = Math.max(80, Math.round((groundImg.naturalWidth / groundImg.naturalHeight) * GROUND_H));
        const offset = w.groundScroll % tileW;
        for (let gx = -offset; gx < CANVAS_W + tileW; gx += tileW) {
          ctx.drawImage(groundImg, gx, GROUND_Y, tileW + 1, GROUND_H);
        }
      } else {
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(0, GROUND_Y, CANVAS_W, 24);
        ctx.fillStyle = '#B45309';
        ctx.fillRect(0, GROUND_Y + 24, CANVAS_W, GROUND_H - 24);
      }

      // 4. Collectibles
      const timeSec = now / 1000;
      for (const col of w.collectibles) {
        const bobY = col.y + Math.sin(timeSec * 5 + col.bobOffset) * 5;
        const img =
          col.kind === 'powerup'
            ? imgs.powerup || imgs.collectible
            : imgs[col.slotId] || imgs.collectible;
        if (col.kind === 'powerup') {
          ctx.save();
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(col.x, bobY, col.r + 7 + Math.sin(timeSec * 8) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        drawSpriteFit(ctx, img, col.x - col.r, bobY - col.r, col.r * 2, col.r * 2, false);
      }

      // 5. Obstacles
      for (const obs of w.obstacles) {
        const img = imgs[obs.slotId] || imgs.obstacle_ground_1;
        drawSpriteFit(ctx, img, obs.x, obs.y, obs.w, obs.h, true);
      }

      // 6. Particles
      for (const p of w.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. Hero character(s)
      const drawRotatedHero = (
        img: HTMLImageElement | undefined,
        x: number,
        y: number,
        width: number,
        height: number,
        angle: number
      ) => {
        if (!img) return;
        ctx.save();
        const cx = x + width / 2;
        const cy = y + height * 0.65;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        drawSpriteFit(ctx, img, -width / 2, -height * 0.65, width, height, true);
        ctx.restore();
      };

      const blinkHide = w.invulnTimer > 0 && Math.floor(w.invulnTimer * 14) % 2 === 0;
      if (!blinkHide) {
        const onGround = w.heroY >= GROUND_Y - heroH - 2;
        const customHero1Frames = HERO1_RUN_SLOTS.filter((id) => spritesRef.current[id]?.isCustom);
        const hero1Frames = customHero1Frames.length > 0 ? customHero1Frames : HERO1_RUN_SLOTS;
        const hero1Slot = hero1Frames[w.runFrame % hero1Frames.length];
        const hero1Img = imgs[hero1Slot] || imgs.hero_run_1;
        const hero2Img = imgs.hero_2 || imgs.hero_run_1;

        const airTilt = onGround ? 0 : Math.max(-0.14, Math.min(0.11, w.heroVy * 0.00018));
        const hero2GroundBob = onGround ? -Math.abs(Math.sin(w.hero2WalkPhase)) * 5 : 0;
        const hero2GroundTilt = onGround ? Math.sin(w.hero2WalkPhase) * 0.045 : airTilt;

        if (activeHeroRef.current === '2') {
          drawRotatedHero(
            hero2Img,
            heroX,
            w.heroY + hero2GroundBob,
            heroW,
            heroH,
            hero2GroundTilt
          );
        } else {
          drawRotatedHero(hero1Img, heroX, w.heroY, heroW, heroH, airTilt);
        }
      }

      // Active rainbow shield bubble around hero
      if (w.shieldTimer > 0) {
        ctx.save();
        ctx.strokeStyle = w.shieldTimer < 1.5 && Math.floor(w.shieldTimer * 10) % 2 === 0 ? '#93C5FD' : '#3B82F6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.14)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(heroX + heroW / 2, w.heroY + heroH / 2, 54, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 8. Floating popups
      for (const pop of w.popups) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, pop.life * 1.4);
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [difficulty, highScore, onUpdateHighScore]);

  const customCount = Object.values(sprites).filter((s) => s.isCustom).length;
  const cleanHero1 = hero1Name.trim() || 'Héroe 1';
  const cleanHero2 = hero2Name.trim() || 'Héroe 2';
  const activeRunnerLabel = activeHero === '2' ? cleanHero2 : cleanHero1;
  const activeNameSprite =
    activeHero === '2' ? sprites.cover_hero_2_name : sprites.cover_hero_1_name;

  const customHero1Frames = HERO1_RUN_SLOTS.filter((id) => sprites[id]?.isCustom);
  const hero1PreviewFrames = customHero1Frames.length > 0 ? customHero1Frames : HERO1_RUN_SLOTS;
  const hero1PreviewSlot = hero1PreviewFrames[titleAnimFrame % hero1PreviewFrames.length];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Top Game Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-hand text-2xl font-normal tracking-normal text-slate-900">{gameTitle}</h1>
          <span className="text-xs text-slate-500">
            {customCount > 0 ? `${customCount} dibujos propios activos` : 'Usando dibujos base'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <Scissors className="h-3.5 w-3.5 text-slate-500" />
            Cambiar dibujos
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 transition-colors hover:bg-slate-50"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {gameState === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setGameState('PAUSED')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Pause className="h-3.5 w-3.5" />
              Pausa
            </button>
          )}
        </div>
      </div>

      {/* Game Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
        {/* In-game HUD Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 py-2.5">
          {/* Active Hero Name & Lives */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
              <img
                src={activeHero === '2' ? sprites.hero_2?.dataUrl : sprites.hero_run_1?.dataUrl}
                alt={activeRunnerLabel}
                className="h-7 w-7 rounded object-contain"
              />
              {activeNameSprite?.isCustom ? (
                <img
                  src={activeNameSprite.dataUrl}
                  alt={activeRunnerLabel}
                  className="h-6 max-w-[140px] object-contain"
                />
              ) : (
                <span className="max-w-[160px] truncate text-xs font-semibold text-slate-800">
                  {activeRunnerLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5" aria-label={`Vidas: ${hudLives}`}>
              {Array.from({ length: DIFFICULTY_CONFIG[difficulty].hearts }).map((_, i) => {
                const alive = i < hudLives;
                return (
                  <img
                    key={i}
                    src={sprites.heart?.dataUrl}
                    alt={alive ? 'Vida' : 'Vida perdida'}
                    className={`h-6 w-6 object-contain transition-opacity ${
                      alive ? 'opacity-100' : 'opacity-20 grayscale'
                    }`}
                  />
                );
              })}
              {hasShield && (
                <span className="ml-2 text-xs font-semibold text-blue-600">· Escudo activo</span>
              )}
            </div>
          </div>

          {/* Scoreboard */}
          <div className="flex items-center gap-5 text-sm">
            <div className="flex items-center gap-1.5">
              <img
                src={sprites.collectible?.dataUrl}
                alt="Premios"
                className="h-5 w-5 object-contain"
              />
              <span className="font-mono font-semibold text-slate-900 tabular-nums">{hudStars}</span>
            </div>
            <div className="text-slate-600">
              Puntos:{' '}
              <span className="font-mono font-bold text-slate-900 tabular-nums">{hudScore}</span>
            </div>
            <div className="hidden text-slate-500 sm:block">
              Récord:{' '}
              <span className="font-mono font-semibold text-slate-700 tabular-nums">
                {Math.max(highScore, hudScore)}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Canvas */}
        <div className="relative aspect-[2/1] w-full select-none bg-sky-50">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={(e) => {
              e.preventDefault();
              if (gameState === 'PLAYING') triggerJump();
            }}
            className="h-full w-full cursor-pointer touch-none block"
          />

          {/* Title Menu Overlay */}
          {gameState === 'TITLE_MENU' && (
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-[2px]">
              <div className="relative my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-xl">
                {/* Cover Title & Decorative Elements */}
                <div className="mb-2 flex items-center justify-center gap-3">
                  {sprites.cover_decor_1?.isCustom ? (
                    <img
                      src={sprites.cover_decor_1.dataUrl}
                      alt="Decoración de portada 1"
                      className="h-12 w-12 object-contain shrink-0"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    {sprites.cover?.isCustom ? (
                      <img
                        src={sprites.cover.dataUrl}
                        alt={gameTitle}
                        className="mx-auto mb-1 max-h-16 object-contain"
                      />
                    ) : null}
                    <input
                      type="text"
                      value={gameTitle}
                      onChange={(e) => onChangeTitle(e.target.value)}
                      maxLength={40}
                      placeholder="Las aventuras de Teo&Benja"
                      aria-label="Nombre del juego"
                      className="font-hand w-full rounded-lg border border-transparent bg-transparent py-0.5 text-center text-2xl leading-snug text-slate-900 transition-colors hover:border-slate-200 focus:border-blue-500 focus:bg-slate-50 focus:outline-none sm:text-[26px]"
                    />
                  </div>

                  {sprites.cover_decor_2?.isCustom ? (
                    <img
                      src={sprites.cover_decor_2.dataUrl}
                      alt="Decoración de portada 2"
                      className="h-12 w-12 object-contain shrink-0"
                    />
                  ) : null}
                </div>

                {sprites.cover_decor_3?.isCustom ? (
                  <img
                    src={sprites.cover_decor_3.dataUrl}
                    alt="Decoración de portada 3"
                    className="mx-auto mb-2 h-9 object-contain"
                  />
                ) : null}

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Escoge a tu héroe
                </p>

                {/* 2 Visual Hero Selection Cards */}
                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  {/* Hero 1 Card */}
                  <button
                    type="button"
                    onClick={() => onChangeActiveHero('1')}
                    className={`group relative flex flex-col items-center rounded-xl border-2 p-2.5 transition-all ${
                      activeHero === '1'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="mb-1.5 flex h-16 w-full items-center justify-center">
                      <img
                        src={sprites[hero1PreviewSlot]?.dataUrl}
                        alt={cleanHero1}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex h-8 w-full items-center justify-center">
                      {sprites.cover_hero_1_name?.isCustom ? (
                        <img
                          src={sprites.cover_hero_1_name.dataUrl}
                          alt={cleanHero1}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="truncate text-sm font-bold text-slate-900">{cleanHero1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
                        activeHero === '1' ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    >
                      {activeHero === '1' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Elegido
                        </>
                      ) : (
                        'Tocar para elegir'
                      )}
                    </span>
                  </button>

                  {/* Hero 2 Card */}
                  <button
                    type="button"
                    onClick={() => onChangeActiveHero('2')}
                    className={`group relative flex flex-col items-center rounded-xl border-2 p-2.5 transition-all ${
                      activeHero === '2'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="mb-1.5 flex h-16 w-full items-center justify-center">
                      <img
                        src={sprites.hero_2?.dataUrl}
                        alt={cleanHero2}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex h-8 w-full items-center justify-center">
                      {sprites.cover_hero_2_name?.isCustom ? (
                        <img
                          src={sprites.cover_hero_2_name.dataUrl}
                          alt={cleanHero2}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="truncate text-sm font-bold text-slate-900">{cleanHero2}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
                        activeHero === '2' ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    >
                      {activeHero === '2' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Elegido
                        </>
                      ) : (
                        'Tocar para elegir'
                      )}
                    </span>
                  </button>
                </div>

                {/* Difficulty Selector */}
                <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
                  {(['gentle', 'normal', 'brisk'] as const).map((mode) => {
                    const active = difficulty === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onChangeDifficulty(mode)}
                        className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {DIFFICULTY_CONFIG[mode].label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-blue-700"
                >
                  <Play className="h-5 w-5 fill-current" />
                  ¡Empezar a jugar!
                </button>

                <p className="mt-2.5 text-xs text-slate-500">
                  Controles: toca la pantalla, haz clic o presiona <strong>Espacio</strong> para saltar y hacer doble salto.
                </p>
              </div>
            </div>
          )}

          {/* Pause Overlay */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Juego en pausa</h2>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGameState('PLAYING')}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Seguir jugando
                  </button>
                  <button
                    type="button"
                    onClick={startGame}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reiniciar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                {activeNameSprite?.isCustom ? (
                  <div className="mb-2 flex flex-col items-center gap-1">
                    <img
                      src={activeHero === '2' ? sprites.hero_2?.dataUrl : sprites.hero_run_1?.dataUrl}
                      alt={activeRunnerLabel}
                      className="h-12 w-12 object-contain"
                    />
                    <img
                      src={activeNameSprite.dataUrl}
                      alt={activeRunnerLabel}
                      className="h-8 max-w-[200px] object-contain"
                    />
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {isNewRecord ? '¡Nuevo récord!' : '¡Gran aventura!'}
                    </h2>
                  </div>
                ) : (
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    {isNewRecord ? `¡Nuevo récord, ${activeRunnerLabel}!` : `¡Gran aventura, ${activeRunnerLabel}!`}
                  </h2>
                )}
                <p className="mt-1 text-sm text-slate-600">
                  {isNewRecord
                    ? 'Superaste tu mejor puntaje anterior.'
                    : '¿Listo para intentarlo otra vez?'}
                </p>

                <div className="my-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <div className="text-xs text-slate-500">Puntos totales</div>
                    <div className="mt-0.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {hudScore}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Premios recogidos</div>
                    <div className="mt-0.5 font-mono text-2xl font-bold text-amber-600 tabular-nums">
                      {hudStars}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={startGame}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Jugar otra vez
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cambiar héroe o dificultad
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gentle bottom instructions strip */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          <strong>Salto:</strong> clic, tocar pantalla o tecla Espacio · Presiona dos veces en el aire para doble salto.
        </span>
        <span>{DIFFICULTY_CONFIG[difficulty].subtitle}</span>
      </div>
    </div>
  );
};
