export type SpriteSlotId =
  | 'hero_run_1'
  | 'hero_run_2'
  | 'hero_run_3'
  | 'hero_run_4'
  | 'hero_run_5'
  | 'hero_2'
  | 'obstacle_ground_1'
  | 'obstacle_ground_2'
  | 'obstacle_ground_3'
  | 'obstacle_ground_4'
  | 'obstacle_ground_5'
  | 'obstacle_ground_6'
  | 'obstacle_ground_7'
  | 'obstacle_air'
  | 'collectible'
  | 'collectible_2'
  | 'collectible_3'
  | 'collectible_4'
  | 'powerup'
  | 'heart'
  | 'ground'
  | 'background'
  | 'sky_decor'
  | 'decor_1'
  | 'decor_2'
  | 'decor_3'
  | 'decor_4'
  | 'decor_5'
  | 'cover'
  | 'cover_hero_1_name'
  | 'cover_hero_2_name'
  | 'cover_decor_1'
  | 'cover_decor_2'
  | 'cover_decor_3';

export type GameDifficulty = 'gentle' | 'normal' | 'brisk';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UploadedSheet {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface SpriteAsset {
  slotId: SpriteSlotId;
  dataUrl: string;
  width: number;
  height: number;
  isCustom: boolean;
  sourceSheetId?: string;
  updatedAt: number;
}

export interface SlotDefinition {
  id: SpriteSlotId;
  label: string;
  category: 'hero' | 'obstacles' | 'rewards' | 'decor' | 'cover_art' | 'world';
  categoryLabel: string;
  hint: string;
  requiredForCore: boolean;
  defaultRemoveBg: boolean;
  defaultTrim: boolean;
  recommendedOrientation: string;
}

export const SLOT_DEFINITIONS: SlotDefinition[] = [
  {
    id: 'hero_run_1',
    label: 'Héroe 1 caminando (1)',
    category: 'hero',
    categoryLabel: 'Protagonistas',
    hint: 'Dibujo 1 de la secuencia para caminar del Héroe 1 (mirando a la derecha).',
    requiredForCore: true,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la derecha →',
  },
  {
    id: 'hero_run_2',
    label: 'Héroe 1 caminando (2)',
    category: 'hero',
    categoryLabel: 'Protagonistas',
    hint: 'Dibujo 2 de la secuencia para caminar del Héroe 1.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la derecha →',
  },
  {
    id: 'hero_run_3',
    label: 'Héroe 1 caminando (3)',
    category: 'hero',
    categoryLabel: 'Protagonistas',
    hint: 'Dibujo 3 de la secuencia para caminar del Héroe 1.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la derecha →',
  },
  {
    id: 'hero_run_4',
    label: 'Héroe 1 caminando (4)',
    category: 'hero',
    categoryLabel: 'Protagonistas',
    hint: 'Dibujo 4 de la secuencia para caminar del Héroe 1.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la derecha →',
  },
  {
    id: 'hero_run_5',
    label: 'Héroe 1 caminando (5)',
    category: 'hero',
    categoryLabel: 'Protagonistas',
    hint: 'Dibujo 5 de la secuencia para caminar del Héroe 1.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la derecha →',
  },
  {
    id: 'hero_2',
    label: 'Héroe 2 (dibujo único)',
    category: 'hero',
    categoryLabel: 'Protagonistas',
    hint: 'Dibujo único del segundo héroe (se anima con un brinquito suave al correr).',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la derecha →',
  },
  {
    id: 'obstacle_ground_1',
    label: 'Obstáculo de suelo 1',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Roca, monstruito, tronco o charco para saltar encima.',
    requiredForCore: true,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_ground_2',
    label: 'Obstáculo de suelo 2',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Segundo obstáculo para darle variedad al camino.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_ground_3',
    label: 'Obstáculo de suelo 3',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Obstáculo extra de suelo para más variedad al correr.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_ground_4',
    label: 'Obstáculo de suelo 4',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Obstáculo extra de suelo (monstruo, trampa, caja, etc.).',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_ground_5',
    label: 'Obstáculo de suelo 5',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Obstáculo extra de suelo para que el camino siempre sorprenda.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_ground_6',
    label: 'Obstáculo de suelo 6',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Obstáculo extra de suelo dibujado por tus hijos.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_ground_7',
    label: 'Obstáculo de suelo 7',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Séptimo obstáculo de suelo para combinar en la carrera.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'obstacle_air',
    label: 'Obstáculo volador',
    category: 'obstacles',
    categoryLabel: 'Obstáculos',
    hint: 'Pájaro, abeja, ovni o nube que vuela a media altura.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Mirando a la izquierda ←',
  },
  {
    id: 'collectible',
    label: 'Premio 1 (Puntos)',
    category: 'rewards',
    categoryLabel: 'Premios e interfaz',
    hint: 'Estrella, moneda, fruta o dulce que suma puntos.',
    requiredForCore: true,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'collectible_2',
    label: 'Premio 2 (Puntos)',
    category: 'rewards',
    categoryLabel: 'Premios e interfaz',
    hint: 'Segundo premio distinto que aparece en el camino para sumar puntos.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'collectible_3',
    label: 'Premio 3 (Puntos)',
    category: 'rewards',
    categoryLabel: 'Premios e interfaz',
    hint: 'Tercer premio coleccionable (fruta, gema, juguete, moneda...).',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'collectible_4',
    label: 'Premio 4 (Puntos)',
    category: 'rewards',
    categoryLabel: 'Premios e interfaz',
    hint: 'Cuarto premio coleccionable para variar las recompensas.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'powerup',
    label: 'Premio especial (Escudo)',
    category: 'rewards',
    categoryLabel: 'Premios e interfaz',
    hint: 'Da un escudo arcoíris protector y recupera una vida.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'heart',
    label: 'Ícono de vida',
    category: 'rewards',
    categoryLabel: 'Premios e interfaz',
    hint: 'Corazón o mini-carita para mostrar las vidas en pantalla.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cuadrado',
  },
  {
    id: 'ground',
    label: 'Suelo infinito',
    category: 'world',
    categoryLabel: 'Escenario',
    hint: 'Tira horizontal de pasto, camino o tierra que se repite sin fin.',
    requiredForCore: true,
    defaultRemoveBg: false,
    defaultTrim: false,
    recommendedOrientation: 'Horizontal ancho',
  },
  {
    id: 'background',
    label: 'Fondo del escenario',
    category: 'world',
    categoryLabel: 'Escenario',
    hint: 'Paisaje lejano de cielo, montañas o espacio. Desactiva quitafondo si está todo pintado.',
    requiredForCore: false,
    defaultRemoveBg: false,
    defaultTrim: false,
    recommendedOrientation: 'Horizontal completo',
  },
  {
    id: 'sky_decor',
    label: 'Adorno del cielo',
    category: 'decor',
    categoryLabel: 'Objetos decorativos',
    hint: 'Nube, planeta o globo que pasa flotando despacio por el cielo.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Horizontal',
  },
  {
    id: 'decor_1',
    label: 'Objeto decorativo 1',
    category: 'decor',
    categoryLabel: 'Objetos decorativos',
    hint: 'Árbol, flor, casa o adorno que pasa por el fondo sin chocar.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'decor_2',
    label: 'Objeto decorativo 2',
    category: 'decor',
    categoryLabel: 'Objetos decorativos',
    hint: 'Segundo adorno para el paisaje del juego (no hace daño).',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'decor_3',
    label: 'Objeto decorativo 3',
    category: 'decor',
    categoryLabel: 'Objetos decorativos',
    hint: 'Tercer adorno de paisaje (arbustos, letreros, hongos, etc.).',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'decor_4',
    label: 'Objeto decorativo 4',
    category: 'decor',
    categoryLabel: 'Objetos decorativos',
    hint: 'Cuarto adorno que acompaña la aventura en el fondo.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'decor_5',
    label: 'Objeto decorativo 5',
    category: 'decor',
    categoryLabel: 'Objetos decorativos',
    hint: 'Quinto adorno decorativo para darle vida al escenario.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'cover',
    label: 'Portada / Título',
    category: 'cover_art',
    categoryLabel: 'Portada y título',
    hint: 'Dibujo o letrero principal para mostrar en la pantalla inicial.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Horizontal',
  },
  {
    id: 'cover_hero_1_name',
    label: 'Nombre Héroe 1 (Portada)',
    category: 'cover_art',
    categoryLabel: 'Portada y título',
    hint: 'Letrero o nombre dibujado a mano del primer héroe para la portada.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Horizontal',
  },
  {
    id: 'cover_hero_2_name',
    label: 'Nombre Héroe 2 (Portada)',
    category: 'cover_art',
    categoryLabel: 'Portada y título',
    hint: 'Letrero o nombre dibujado a mano del segundo héroe para la portada.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Horizontal',
  },
  {
    id: 'cover_decor_1',
    label: 'Decoración de portada 1',
    category: 'cover_art',
    categoryLabel: 'Portada y título',
    hint: 'Adorno dibujado (estrella, rayo, corona, corazón...) para decorar la portada.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'cover_decor_2',
    label: 'Decoración de portada 2',
    category: 'cover_art',
    categoryLabel: 'Portada y título',
    hint: 'Segundo adorno para acompañar el título en la pantalla inicial.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
  {
    id: 'cover_decor_3',
    label: 'Decoración de portada 3',
    category: 'cover_art',
    categoryLabel: 'Portada y título',
    hint: 'Tercer elemento decorativo para la portada del juego.',
    requiredForCore: false,
    defaultRemoveBg: true,
    defaultTrim: true,
    recommendedOrientation: 'Cualquier ángulo',
  },
];
