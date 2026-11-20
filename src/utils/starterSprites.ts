import { SpriteAsset, SpriteSlotId } from '../types/game';

function drawCanvasToUrl(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void
): { dataUrl: string; width: number; height: number } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  paint(ctx);
  return { dataUrl: c.toDataURL('image/png'), width: w, height: h };
}

function drawHero(step: 1 | 2 | 3 | 4 | 5) {
  return drawCanvasToUrl(120, 120, (ctx) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const stride = [
      { leg1X: 40, leg1Y: 106, leg2X: 84, leg2Y: 104, armX: 90, armY: 66, bob: 0 },
      { leg1X: 50, leg1Y: 108, leg2X: 74, leg2Y: 106, armX: 86, armY: 62, bob: -2 },
      { leg1X: 60, leg1Y: 107, leg2X: 62, leg2Y: 100, armX: 82, armY: 58, bob: -3 },
      { leg1X: 74, leg1Y: 105, leg2X: 50, leg2Y: 107, armX: 88, armY: 63, bob: -1 },
      { leg1X: 82, leg1Y: 104, leg2X: 44, leg2Y: 107, armX: 92, armY: 67, bob: 0 },
    ][step - 1];

    // Cape
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 54 + stride.bob);
    ctx.quadraticCurveTo(16, 56 + stride.bob, 12, 74 + stride.bob);
    ctx.quadraticCurveTo(32, 78 + stride.bob, 52, 72 + stride.bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Legs
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(56, 84 + stride.bob);
    ctx.lineTo(stride.leg1X, stride.leg1Y);
    ctx.moveTo(68, 84 + stride.bob);
    ctx.lineTo(stride.leg2X, stride.leg2Y);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#3B82F6';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(42, 48 + stride.bob, 38, 38, 16);
    ctx.fill();
    ctx.stroke();

    // Belly patch
    ctx.fillStyle = '#DBEAFE';
    ctx.beginPath();
    ctx.ellipse(65, 68 + stride.bob, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(64, 38 + stride.bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(72, 33 + stride.bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(74, 33 + stride.bob, 3, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(72, 43 + stride.bob, 7, 0.1 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Arm
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(72, 58 + stride.bob);
    ctx.lineTo(stride.armX, stride.armY);
    ctx.stroke();
  });
}

function drawHero2() {
  return drawCanvasToUrl(120, 120, (ctx) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Tail / scarf
    ctx.fillStyle = '#EC4899';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(46, 56);
    ctx.quadraticCurveTo(18, 50, 14, 68);
    ctx.quadraticCurveTo(32, 74, 50, 68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Legs
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(54, 84);
    ctx.lineTo(48, 106);
    ctx.moveTo(70, 84);
    ctx.lineTo(78, 106);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(42, 48, 38, 38, 16);
    ctx.fill();
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(46, 26);
    ctx.lineTo(42, 8);
    ctx.lineTo(58, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(68, 20);
    ctx.lineTo(78, 8);
    ctx.lineTo(82, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(64, 38, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(72, 34, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(74, 34, 3, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(72, 44, 6.5, 0.1 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  });
}

let cachedStarters: Record<SpriteSlotId, SpriteAsset> | null = null;

export function getStarterSprites(forceRefresh = false): Record<SpriteSlotId, SpriteAsset> {
  if (cachedStarters && !forceRefresh) return cachedStarters;

  const now = 0;
  const make = (slotId: SpriteSlotId, res: { dataUrl: string; width: number; height: number }): SpriteAsset => ({
    slotId,
    dataUrl: res.dataUrl,
    width: res.width,
    height: res.height,
    isCustom: false,
    updatedAt: now,
  });

  const obstacle1 = drawCanvasToUrl(100, 100, (ctx) => {
    ctx.fillStyle = '#64748B';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(16, 86);
    ctx.lineTo(28, 34);
    ctx.lineTo(52, 20);
    ctx.lineTo(78, 38);
    ctx.lineTo(86, 86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Googly eyes on rock
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(42, 56, 7, 0, Math.PI * 2);
    ctx.arc(60, 56, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(40, 56, 3, 0, Math.PI * 2);
    ctx.arc(58, 56, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  const obstacle2 = drawCanvasToUrl(100, 110, (ctx) => {
    ctx.fillStyle = '#10B981';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.roundRect(36, 20, 28, 76, 14);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(16, 44, 22, 16, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(62, 36, 22, 16, 8);
    ctx.fill();
    ctx.stroke();
  });

  const obstacleAir = drawCanvasToUrl(110, 80, (ctx) => {
    ctx.fillStyle = '#F97316';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.ellipse(54, 44, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Wing
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.moveTo(50, 34);
    ctx.quadraticCurveTo(64, 8, 78, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Beak facing left
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(26, 40);
    ctx.lineTo(12, 46);
    ctx.lineTo(27, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(38, 40, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const collectible = drawCanvasToUrl(80, 80, (ctx) => {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 30 : 14;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const x = 40 + Math.cos(angle) * r;
      const y = 40 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  const powerup = drawCanvasToUrl(90, 90, (ctx) => {
    ctx.fillStyle = '#EC4899';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(45, 45, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(45, 45, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0EA5E9';
    ctx.beginPath();
    ctx.arc(45, 45, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  const heart = drawCanvasToUrl(64, 64, (ctx) => {
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(32, 54);
    ctx.bezierCurveTo(10, 40, 8, 16, 22, 14);
    ctx.bezierCurveTo(29, 13, 32, 20, 32, 22);
    ctx.bezierCurveTo(32, 20, 35, 13, 42, 14);
    ctx.bezierCurveTo(56, 16, 54, 40, 32, 54);
    ctx.fill();
    ctx.stroke();
  });

  const ground = drawCanvasToUrl(320, 80, (ctx) => {
    ctx.fillStyle = '#B45309';
    ctx.fillRect(0, 22, 320, 58);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 0, 320, 26);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(320, 2);
    ctx.moveTo(0, 26);
    ctx.lineTo(320, 26);
    ctx.stroke();
    // Little pebbles
    ctx.fillStyle = '#92400E';
    for (let x = 24; x < 310; x += 56) {
      ctx.beginPath();
      ctx.arc(x, 48, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const background = drawCanvasToUrl(960, 460, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 460);
    grad.addColorStop(0, '#E0F2FE');
    grad.addColorStop(1, '#F8FAFC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 460);

    // Distant soft hills
    ctx.fillStyle = '#BAE6FD';
    ctx.beginPath();
    ctx.moveTo(0, 460);
    ctx.quadraticCurveTo(180, 280, 380, 400);
    ctx.quadraticCurveTo(620, 250, 960, 390);
    ctx.lineTo(960, 460);
    ctx.closePath();
    ctx.fill();
  });

  const skyDecor = drawCanvasToUrl(160, 90, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(54, 52, 22, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(82, 36, 26, Math.PI, Math.PI * 2);
    ctx.arc(110, 52, 20, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  const cover = drawCanvasToUrl(360, 140, (ctx) => {
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(10, 14, 340, 112, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '21px "Gloria Hallelujah", cursive, sans-serif';
    ctx.fillText('Las aventuras de', 180, 50);
    ctx.font = '30px "Gloria Hallelujah", cursive, sans-serif';
    ctx.fillText('Teo&Benja', 180, 90);
  });

  const obstacle3 = drawCanvasToUrl(100, 100, (ctx) => {
    ctx.fillStyle = '#A855F7';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(16, 86);
    ctx.quadraticCurveTo(50, 18, 84, 86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(50, 56, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(48, 56, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const decorTree = drawCanvasToUrl(110, 130, (ctx) => {
    ctx.fillStyle = '#92400E';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(45, 72, 20, 48, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4ADE80';
    ctx.beginPath();
    ctx.arc(55, 52, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const decorFlower = drawCanvasToUrl(90, 100, (ctx) => {
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(45, 92);
    ctx.lineTo(45, 48);
    ctx.stroke();
    ctx.fillStyle = '#F472B6';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5;
      ctx.beginPath();
      ctx.arc(45 + Math.cos(a) * 14, 40 + Math.sin(a) * 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(45, 40, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const collectible2 = drawCanvasToUrl(80, 80, (ctx) => {
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(40, 12);
    ctx.lineTo(66, 36);
    ctx.lineTo(40, 68);
    ctx.lineTo(14, 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  const collectible3 = drawCanvasToUrl(80, 80, (ctx) => {
    ctx.fillStyle = '#EF4444';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(40, 46, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(48, 20, 10, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const collectible4 = drawCanvasToUrl(80, 80, (ctx) => {
    ctx.fillStyle = '#F97316';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(18, 24, 44, 32, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(40, 40, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  const makeNameTag = (text: string, bg: string) =>
    drawCanvasToUrl(240, 72, (ctx) => {
      ctx.fillStyle = bg;
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(6, 6, 228, 60, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 120, 36);
    });

  const coverDecorSpark = drawCanvasToUrl(90, 90, (ctx) => {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 34 : 14;
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const x = 45 + Math.cos(a) * r;
      const y = 45 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  const coverDecorCrown = drawCanvasToUrl(100, 80, (ctx) => {
    ctx.fillStyle = '#FB923C';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 62);
    ctx.lineTo(18, 22);
    ctx.lineTo(36, 42);
    ctx.lineTo(50, 14);
    ctx.lineTo(64, 42);
    ctx.lineTo(82, 22);
    ctx.lineTo(86, 62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  cachedStarters = {
    hero_run_1: make('hero_run_1', drawHero(1)),
    hero_run_2: make('hero_run_2', drawHero(2)),
    hero_run_3: make('hero_run_3', drawHero(3)),
    hero_run_4: make('hero_run_4', drawHero(4)),
    hero_run_5: make('hero_run_5', drawHero(5)),
    hero_2: make('hero_2', drawHero2()),
    obstacle_ground_1: make('obstacle_ground_1', obstacle1),
    obstacle_ground_2: make('obstacle_ground_2', obstacle2),
    obstacle_ground_3: make('obstacle_ground_3', obstacle3),
    obstacle_ground_4: make('obstacle_ground_4', obstacle1),
    obstacle_ground_5: make('obstacle_ground_5', obstacle2),
    obstacle_ground_6: make('obstacle_ground_6', obstacle3),
    obstacle_ground_7: make('obstacle_ground_7', obstacle1),
    obstacle_air: make('obstacle_air', obstacleAir),
    collectible: make('collectible', collectible),
    collectible_2: make('collectible_2', collectible2),
    collectible_3: make('collectible_3', collectible3),
    collectible_4: make('collectible_4', collectible4),
    powerup: make('powerup', powerup),
    heart: make('heart', heart),
    ground: make('ground', ground),
    background: make('background', background),
    sky_decor: make('sky_decor', skyDecor),
    decor_1: make('decor_1', decorTree),
    decor_2: make('decor_2', decorFlower),
    decor_3: make('decor_3', decorTree),
    decor_4: make('decor_4', decorFlower),
    decor_5: make('decor_5', decorTree),
    cover: make('cover', cover),
    cover_hero_1_name: make('cover_hero_1_name', makeNameTag('Héroe 1', '#DBEAFE')),
    cover_hero_2_name: make('cover_hero_2_name', makeNameTag('Héroe 2', '#FEF3C7')),
    cover_decor_1: make('cover_decor_1', coverDecorSpark),
    cover_decor_2: make('cover_decor_2', coverDecorCrown),
    cover_decor_3: make('cover_decor_3', coverDecorSpark),
  };

  return cachedStarters;
}
