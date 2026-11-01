import { ENEMIES } from '@/app/(protected)/(engine)/data/enemies'
import { ITEMS } from '@/app/(protected)/(engine)/data/items'
import { RUNE_FAMILIES } from '@/app/(protected)/(engine)/data/runes'
import { TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
import { Terrain } from '@/app/(protected)/(engine)/models/Terrain'
import { ENEMY_LOOKS, HERO_BODIES, HERO_LOOKS, HERO_OUTFITS, HERO_WEAPONS } from '@/scripts/art/descriptions'

/**
 * Every piece of art of the game: its file (under art/source/ as generated,
 * under public/art/ once processed), its size, the batch it belongs to and its
 * full prompt. `yarn art` processes what is there and lists what is missing;
 * `yarn art:catalog` writes art/catalog.csv for generating them.
 */

export type PieceKind =
  | 'hero'
  | 'heroPart'
  | 'heroLimb'
  | 'weapon'
  | 'portrait'
  | 'enemy'
  | 'boss'
  | 'bossParts'
  | 'background'
  | 'mapSheet'
  | 'propSheet'
  | 'scenerySheet'
  | 'building'
  | 'tile'
  | 'icon'

export interface Piece {
  /** Path without extension, under art/source/ (png) and public/art/ (webp). */
  id: string
  kind: PieceKind
  width: number
  height: number
  batch: string
  prompt: string
}

export const BASE_PROMPT =
  'Arte de videojuego para móviles estilo caricatura, alegre y luminoso, para todas las edades, formas redondeadas y gruesas, contornos limpios y gruesos marrón oscuro, sombreado cel suave en dos tonos delicados, colores vivos y saturados, superficies lisas y limpias sin textura granulada, luz cálida y suave, silueta clara y legible, sin texto, sin marca de agua, sin firma.'
/** How heroes are drawn: stylized cartoon, not chibi, so the puppet limbs stay long enough to animate. */
const CARTOON_BODY =
  'Proporciones de caricatura estilizada: la cabeza mide alrededor de un cuarto de la altura total, ojos grandes y expresivos, rasgos faciales simples y amigables, manos, pies y arma un poco más grandes de lo normal.'
/** How creatures are drawn: rounded and expressive, menacing at most, never gory. */
const CARTOON_CREATURE =
  'Proporciones de caricatura: cabeza un poco más grande de lo normal, ojos grandes y expresivos, cuerpo simplificado y redondeado, como mucho amenazante pero nunca sangriento.'
const CHROMA = 'Fondo liso y plano #00FF00, sin sombra en el suelo.'
const FLAME = 'Una pequeña llama ámbar brillante (#FFB020) incrustada en el pecho o en el arma.'
/**
 * Ground textures of the world map: they repeat across the ground, so they
 * share a style of their own (no silhouettes, no rim light) and each one,
 * after the grass, is made with the grass attached as reference.
 */
const TILE_PROMPT =
  'Arte de videojuego para móviles de fantasía oscura madura, textura de suelo pintada a mano, sombreado cel de alto contraste con sombras en dos tonos, colores saturados, sutil textura pictórica, finas líneas de tinta oscura en los detalles, sin texto, sin marca de agua, sin firma.'
const TILE_RULES =
  'Textura cuadrada repetible sin costuras para el suelo del mapa de un juego 2D, vista desde arriba en vertical (cenital pura, sin perspectiva, sin horizonte). El patrón llena todo el cuadrado de forma pareja y continúa a través de los cuatro bordes, de modo que las copias puestas lado a lado se unan sin costura. Luz suave y pareja desde arriba a la izquierda, sin sombras proyectadas de nada exterior, sin marco, sin borde, sin viñeta, sin ningún objeto grande: cada detalle es más chico que un décimo del cuadrado.'
const TILE_REFERENCE = 'Mismo estilo, escala de detalle, iluminación y saturación que la textura de pasto adjunta.'
const TILES: Record<Terrain, string> = {
  [Terrain.GRASS]: 'pasto corto y verde exuberante de pradera con matitas diminutas y algunas hojitas de trébol',
  [Terrain.MOSS]: 'suelo de bosque verde oscuro de musgo espeso con agujas de pino caídas y helechos diminutos',
  [Terrain.SNOW]: 'nieve fresca compactada, blanca con sombras azul pálido y pequeños montículos suaves',
  [Terrain.SAND]: 'arena dorada y cálida del desierto con suaves ondas de viento y piedritas diminutas dispersas',
  [Terrain.ASH]: 'ceniza volcánica fría gris violácea con pequeñas escorias y algunas brasas tenues brillantes',
  [Terrain.DIRT]: 'tierra marrón compactada con piedritas, grietas y algunas raíces',
  [Terrain.ROCK]: 'roca madre gris y áspera con grietas, astillas y manchas de liquen',
  [Terrain.ICE]: 'hielo de lago congelado, azul pálido translúcido con grietas blancas y burbujas atrapadas',
  [Terrain.STONE]: 'grandes losas planas y gastadas de arenisca encastradas con juntas finas y oscuras',
  [Terrain.COBBLESTONE]:
    'un camino empedrado de adoquines pequeños y redondeados en tonos beige y marrones cálidos, huecos oscuros entre ellos y un poco de musgo',
  [Terrain.WATER]: 'agua de lago azul y clara con pequeñas ondas de luz y destellos, sin orilla',
  [Terrain.LAVA]:
    'lava fundida brillante que fluye en remolinos amarillos, naranjas y rojos, con algunas vetas finas de costra oscura',
  [Terrain.SCORCHED]:
    'tierra volcánica rojo oscuro chamuscada con escorias, pequeñas grietas y brasas naranjas brillantes dispersas',
  [Terrain.MAGMA]:
    'costra de lava enfriada de placas negras y rojo profundo partidas por finas grietas brillantes amarillo anaranjadas',
  [Terrain.FIRESTONE]:
    'grandes losas planas de piedra cocida roja y naranja encastradas con juntas oscuras y algunas manchas de hollín',
  [Terrain.GLOOM]: 'suelo alienígena violeta oscuro casi negro con diminutas motas violetas tenues y brillantes',
  [Terrain.MYCELIUM]:
    'una alfombra de hongos alienígenas violetas y magenta con finas venas violetas brillantes y bulbos diminutos',
  [Terrain.RUNESTONE]:
    'losas de obsidiana negra encastradas con finas juntas violetas brillantes y runas talladas tenues',
  [Terrain.ICHOR]: 'líquido alienígena violeta brillante con lentos remolinos de luz magenta y lila pálido, sin orilla'
}
/** Where each hero joins: their pieces go with that biome's batch. */
const HERO_BATCH: Record<CharacterId, Biome> = {
  [CharacterId.KAEL]: Biome.MEADOWS,
  [CharacterId.SERA]: Biome.FOREST,
  [CharacterId.BRANN]: Biome.DESERT,
  [CharacterId.OREN]: Biome.SNOW,
  [CharacterId.YSOLDE]: Biome.VOLCANIC
}
/** The bosses big enough to be animated by parts. */
const BOSSES_BY_PARTS = ['morgrath', 'sahrak', 'vorneth', 'ignaroth', 'xalqui', 'colossus', 'vael', 'crisol']
/** Two battle backgrounds per biome. */
const BACKGROUNDS: Record<Biome, [string, string]> = {
  [Biome.MEADOWS]: [
    'praderas de trigo dorado sobre colinas onduladas bajo un cálido cielo de mañana, un camino de tierra, una atalaya de piedra en ruinas y un viejo molino a lo lejos, flores silvestres',
    'las afueras de un tranquilo pueblo de granjas al atardecer, cercas de madera, fardos de heno y un pequeño puente de piedra sobre un arroyo'
  ],
  [Biome.FOREST]: [
    'un bosque antiguo con troncos enormes cubiertos de musgo, raíces como murallas y haces de luz pálida entre las copas',
    'un claro brumoso del bosque con un círculo de viejos menhires cubiertos de hiedra y hongos brillantes'
  ],
  [Biome.TROPICAL]: [
    'una selva humeante con helechos gigantes, lianas colgantes y una cascada al fondo, flores exóticas magenta',
    'ruinas de un templo escalonado de jade tragado por la selva, cabezas de serpiente talladas y estanques turquesa'
  ],
  [Biome.DESERT]: [
    'dunas naranjas infinitas bajo un sol abrasador, cabezas de estatuas colosales medio enterradas y viejas piedras gastadas',
    'un cañón de arenisca con antiguas puertas de tumbas talladas en los acantilados y estandartes rasgados colgando'
  ],
  [Biome.MOUNTAINS]: [
    'un alto paso de montaña rocoso con picos grises dentados, un puente de cuerdas y cristales cian que crecen de la roca',
    'el gran salón de una fortaleza enana abandonada tallada en la montaña, pilares gigantes y runas'
  ],
  [Biome.SNOW]: [
    'una tundra helada en plena ventisca, pinos nevados, un lago congelado y glaciares azules a lo lejos',
    'una caverna de hielo con carámbanos azules gigantes y cristales relucientes dentro de las paredes de hielo'
  ],
  [Biome.VOLCANIC]: [
    'un páramo volcánico de basalto negro con ríos de lava brillante, ceniza que cae y un volcán en erupción al fondo',
    'el interior de una cueva de magma con un lago de lava, púas de obsidiana y brasas flotantes'
  ],
  [Biome.WASTELANDS]: [
    'un páramo gris al anochecer, árboles pelados y retorcidos, la silueta de una ciudad en ruinas y un cielo violeta dramático',
    'un antiguo cementerio de campo de batalla con espadas rotas, lápidas torcidas y una suave niebla verde'
  ],
  [Biome.ABYSS]: [
    'el borde del Abismo, una sima roja sin fondo con cadenas, islas de roca flotantes y un castillo negro a lo lejos',
    'el patio del castillo negro del Abismo, púas de hierro, hornos que brillan en rojo y canales de metal fundido'
  ]
}
/** The 16 decorations of each biome's map sheet. */
const MAP_SHEETS: Record<Biome, string> = {
  [Biome.MEADOWS]:
    '4 robles frondosos, 2 fardos de heno, 2 cercas de madera, 2 rocas grises, 2 parcelas de trigo, 1 molino pequeño, 1 pozo de piedra, 1 cartel de madera, 1 carreta rota',
  [Biome.FOREST]:
    '6 pinos y robles altos y oscuros, 2 hongos gigantes, 2 rocas con musgo, 2 troncos caídos, 2 arbustos, 1 menhir, 1 tocón hueco',
  [Biome.TROPICAL]:
    '5 palmeras y árboles de selva, 3 helechos gigantes, 2 arbustos de flores magenta, 2 rocas con musgo, 2 pequeñas ruinas de jade, 1 charca de pantano, 1 tótem',
  [Biome.DESERT]:
    '3 cactus, 3 crestas de duna, 2 rocas de arenisca, 2 calaveras blanqueadas, 2 pilares rotos, 1 oasis con palmeras, 1 cabeza de estatua medio enterrada, 1 tienda, 1 obelisco',
  [Biome.MOUNTAINS]:
    '4 picos rocosos, 3 pinos, 3 rocas grises, 2 grupos de cristales cian, 2 puentes de cuerdas, 1 entrada de mina, 1 estatua enana',
  [Biome.SNOW]:
    '4 pinos nevados, 3 púas de hielo, 2 rocas nevadas, 2 estanques congelados, 2 montículos de nieve, 1 estatua congelada, 1 ruina con forma de iglú, 1 esqueleto de mamut',
  [Biome.VOLCANIC]:
    '3 volcanes pequeños en erupción, 3 agujas de roca roja con vetas de lava, 3 charcos de lava, 2 rocas de magma brillantes, 2 árboles en llamas, 2 géiseres de fuego, 1 forja en ruinas',
  [Biome.WASTELANDS]:
    '4 árboles muertos y retorcidos, 3 lápidas, 2 muros rotos, 2 pilas de huesos, 2 máquinas de asedio rotas, 1 torre en ruinas, 1 horca torcida, 1 charco tóxico verde',
  [Biome.ABYSS]:
    '3 árboles alienígenas con bulbos violetas brillantes, 3 obeliscos negros con runas violetas brillantes, 3 esquirlas de cristal violeta, 2 charcos de icor brillante, 2 hongos alienígenas gigantes, 1 anillo alienígena flotante, 1 máquina alienígena rota'
}
/** Battle scenery of each biome: props scattered in front of and behind the fighters (see battleScenery.ts). */
/**
 * The scenery that fills each biome's map around the trails, in rows: 8 tall
 * pieces (rows 1 and 2), 4 low ones (row 3) and 4 small things that lie on the
 * ground (row 4). The row says where each piece goes, so the order matters.
 */
const SCENERY_SHEETS: Record<Biome, [string, string, string]> = {
  [Biome.MEADOWS]: [
    '6 robles y hayas redondos y frondosos de distintos tamaños y verdes, 2 álamos delgados',
    '2 arbustos verdes redondos, 1 arbusto con flores rosas, 1 roca gris',
    '2 matas de pasto, 1 mancha de flores silvestres amarillas, 1 grupo de piedritas'
  ],
  [Biome.FOREST]: [
    '5 pinos altos y oscuros de distintas alturas, 3 robles grandes y oscuros',
    '2 arbustos densos y oscuros, 1 roca con musgo, 1 helecho',
    '1 mata de pasto, 1 hongo de sombrero rojo, 1 hongo violeta, 1 grupo de piedritas con musgo'
  ],
  [Biome.TROPICAL]: [
    '5 palmeras inclinadas hacia distintos lados, 3 árboles de selva anchos',
    '2 helechos gigantes, 1 arbusto con flores magenta, 1 roca con musgo',
    '1 mata de pasto brillante, 1 mancha de flores magenta, 1 mancha de flores naranjas, 1 helecho pequeño'
  ],
  [Biome.DESERT]: [
    '5 cactus saguaro altos de distintas formas, 3 árboles muertos pelados y retorcidos',
    '2 rocas de arenisca naranja, 1 cactus barril redondo, 1 arbusto seco',
    '1 mata de pasto seco, 1 grupo de piedritas de arenisca, 1 huesito blanqueado, 1 brote de cactus pequeño'
  ],
  [Biome.MOUNTAINS]: [
    '6 pinos de montaña de distintas alturas, 2 agujas de roca gris altas',
    '3 rocas grises de distintas formas, 1 arbusto bajo de montaña',
    '1 mata de pasto de montaña, 1 grupo de piedritas grises, 1 manchita de edelweiss, 1 piedra plana pequeña'
  ],
  [Biome.SNOW]: [
    '6 pinos nevados de distintas alturas, 2 púas de hielo altas',
    '2 rocas nevadas, 1 arbusto nevado, 1 grupo pequeño de cristales de hielo',
    '1 grupo de piedritas heladas, 1 montículo de nieve pequeño, 1 mata de pasto congelado, 1 trocito de carámbano'
  ],
  [Biome.VOLCANIC]: [
    '3 árboles muertos carbonizados con llamas que arden en sus ramas, 3 agujas de roca roja con vetas de lava brillante, 2 géiseres de fuego que brotan de un cono de roca',
    '2 rocas rojo oscuro con grietas de lava naranja brillante, 1 arbusto ardiente de llamas, 1 grupo de cristales de azufre naranjas y amarillos',
    '1 grupo de piedritas de brasa brillantes, 1 llamita titilante, 1 grupo de piedritas rojas, 1 costrita de azufre amarillo'
  ],
  [Biome.WASTELANDS]: [
    '6 árboles muertos grises y retorcidos, 2 pilares de piedra rotos',
    '2 rocas grises, 1 arbusto espinoso seco, 1 espada rota clavada en el suelo',
    '1 mata de pasto seco, 1 grupo de piedritas grises, 1 calaverita, 1 pilita de huesos'
  ],
  [Biome.ABYSS]: [
    '3 árboles alienígenas retorcidos con bulbos violetas brillantes, 2 hongos alienígenas gigantes con lunares brillantes, 2 obeliscos negros con runas violetas brillantes, 1 aguja alta de cristal violeta',
    '1 planta alienígena de vainas con un bulbo violeta brillante, 1 grupo de brotes de tentáculos, 1 pequeño artefacto de piedra rúnica, 1 grupo de cristales violetas',
    '1 grupo de esporas violetas brillantes, 1 grupo de hongos alienígenas diminutos, 1 zarcillo alienígena enroscado, 1 grupo de piedritas negras con destellos violetas'
  ]
}
const PROP_SHEETS: Record<Biome, string> = {
  [Biome.MEADOWS]:
    '2 robles frondosos, 1 abedul joven, 2 fardos de heno, 1 tramo de cerca de madera, 2 rocas grises, 1 arbusto de flores silvestres, 1 cartel de madera, 1 rueda de carreta rota, 1 tocón, 1 espantapájaros',
  [Biome.FOREST]:
    '2 troncos de roble enormes con musgo, 1 pino alto, 2 rocas con musgo, 1 tronco caído, 2 matas de helechos, 1 grupo de hongos brillantes, 1 tocón hueco, 1 menhir rúnico, 1 zarza espinosa',
  [Biome.TROPICAL]:
    '2 palmeras, 1 árbol de selva con lianas colgantes, 2 helechos gigantes, 1 arbusto de flores magenta, 2 rocas con musgo, 1 estatua de jade rota, 1 tótem tallado, 1 grupo de bambú, 1 tronco caído',
  [Biome.DESERT]:
    '2 cactus saguaro altos, 1 acacia muerta, 2 rocas de arenisca, 1 cráneo de buey blanqueado, 1 pilar roto, 1 cabeza de estatua medio enterrada, 1 arbusto espinoso seco, 1 pila de vasijas de barro, 1 obelisco pequeño, 1 asta con un estandarte raído',
  [Biome.MOUNTAINS]:
    '2 pinos azotados por el viento, 3 rocas grises, 1 grupo de cristales cian, 1 mojón de piedras, 1 pilar enano roto, 1 vagoneta de mina, 1 arbusto muerto, 1 piedra rúnica, 1 afloramiento rocoso',
  [Biome.SNOW]:
    '2 pinos nevados, 1 árbol pelado congelado, 2 púas de hielo, 2 rocas nevadas, 1 estatua de guerrero congelada, 1 colmillo de mamut, 1 montículo de nieve, 1 tótem de madera escarchado, 1 trineo roto',
  [Biome.VOLCANIC]:
    '2 árboles muertos quemados, 2 agujas de basalto, 2 rocas de obsidiana, 1 fumarola humeante, 1 roca agrietada que brilla con lava, 1 yunque roto, 1 esqueleto carbonizado, 1 arbusto cubierto de ceniza, 1 brasero de hierro',
  [Biome.WASTELANDS]:
    '2 árboles muertos y retorcidos, 2 lápidas, 1 muro de piedra roto, 1 pila de huesos, 1 horca torcida, 1 rueda de asedio rota, 1 espada oxidada clavada en el suelo, 1 arbusto muerto, 1 estatua agrietada, 1 pozo viejo',
  [Biome.ABYSS]:
    '2 agujas de roca negra dentadas, 2 esquirlas de cristal violeta, 1 pilar encadenado, 1 cerca de púas de hierro, 1 pila de calaveras, 1 estatua negra rota, 1 brasero encendido, 1 roca de obsidiana agrietada, 1 jaula colgando de un poste'
}
/** The building beside each merchant on the world map. */
const MERCHANT_HOUSES: [string, string][] = [
  [
    'peddler',
    'una pequeña y acogedora cabaña de madera con techo de tejas rojas, cajones y bolsas de mercadería a su lado'
  ],
  [
    'alchemist',
    'una tienda de alquimista violeta con ribetes dorados, una banderita arriba y frascos de pociones de colores en la entrada'
  ],
  [
    'smith',
    'una casa-forja de herrero de piedra con techo de pizarra oscura, una chimenea humeante, ventanas iluminadas y un yunque'
  ],
  [
    'scholar',
    'una torre de erudito de piedra delgada con techo azul en punta, una ventana iluminada y libros apilados en la puerta'
  ],
  ['threshold', 'una tienda de mercader negra con ribetes rojos y un farol rojo, ominosa, al borde del Abismo']
]
const SPECIAL_SHEETS: [string, string][] = [
  [
    'map/special-1',
    'un campamento con fogata y tiendas, el mismo campamento apagado y abandonado, un santuario rúnico con una piedra brillante, un cofre del tesoro cerrado, un cofre del tesoro abierto, una carreta de buhonero, una tienda de alquimista, una forja de herrero, una torre de erudito, una tienda negra del mercader del umbral, una cueva guarida de jefe, una arena de jefe marcada con una calavera, un altar de lágrima brillante, un cartel, un puente de piedra, un puente de madera'
  ],
  [
    'map/special-2',
    'un templo del sello de la serpiente de jade, un monolito del sello del coloso de basalto, un trono del sello del caballero hueco, la puerta gigante sellada del Abismo con tres huecos para sellos, la misma puerta abierta, el castillo negro del Abismo, un puente de lava, un puente de hielo, una choza de la bruja del musgo, un foso del rey escorpión, un nido de hielo del wyrm de escarcha, un trono volcánico del señor de la ceniza, una capilla en ruinas, un faro de llama ámbar, un claro inicial con un gran árbol brillante, un santuario de encrucijada'
  ]
]
/** Skill icons: one per damage type, plus the support kinds. */
const SKILL_ICONS: [string, string][] = [
  ['slash', 'un tajo curvo de espada'],
  ['pierce', 'una flecha que atraviesa'],
  ['blunt', 'el impacto de un martillo pesado con grietas'],
  ['fire', 'una llama rugiente'],
  ['ice', 'un cristal de hielo afilado'],
  ['lightning', 'un rayo bifurcado'],
  ['earth', 'una púa de roca que surge del suelo'],
  ['light', 'una estrella sagrada radiante'],
  ['darkness', 'un vacío negro y violeta en remolino'],
  ['heal', 'una hoja verde con una gota de savia brillante'],
  ['buff', 'una flecha dorada hacia arriba sobre un escudo'],
  ['debuff', 'un escudo agrietado con una flecha violeta hacia abajo'],
  ['revive', 'una pluma de fénix que brilla en ámbar']
]
/** Rune icons: one per family (the frame of the game shows the rank). */
const RUNE_ICONS: Record<string, string> = {
  leech: 'un colmillo rojo sangre que gotea en una copa',
  ember: 'un carbón encendido brillante',
  wellspring: 'un manantial de agua azul que brota',
  edge: 'el filo de una hoja afilada que destella',
  ward: 'un escudo protector redondo de luz',
  frost: 'un cristal de copo de nieve congelado',
  vigor: 'un corazón verde que late, con hojas',
  haste: 'una sandalia alada',
  venom: 'una gota de veneno verde con una calavera',
  fury: 'el ojo rojo de una bestia rugiente',
  storm: 'una nube de tormenta con rayos',
  hunter: 'una diana con una flecha'
}
const ITEM_ICONS: Record<string, string> = {
  'health-potion': 'un frasquito redondo de poción roja',
  'focus-potion': 'un frasquito redondo de poción azul',
  antidote: 'un vial verde con un tapón de hoja',
  'fire-bomb': 'una bomba negra redonda con la mecha encendida y llamas naranjas pintadas',
  'greater-health-potion': 'un frasco grande y ornamentado de poción roja con oro',
  'greater-focus-potion': 'un frasco grande y ornamentado de poción azul con plata',
  'revive-potion': 'una poción ámbar con una pluma de fénix adentro',
  'frost-bomb': 'una bomba redonda de vidrio azul pálido con escarcha',
  elixir: 'un frasco de elixir dorado que brilla con luz de arcoíris',
  'rough-stone': 'una piedra de herrería gris y tosca',
  'tempered-stone': 'una piedra de herrería gris azulada pulida con vetas de acero',
  'arcane-stone': 'una piedra de herrería violeta con runas brillantes',
  'abyssal-stone': 'una piedra de herrería negra y roja que late con luz fundida',
  echo: 'un fuego fatuo ámbar translúcido con forma de runa',
  tear: 'una única lágrima plateada brillante del olvido',
  flask: 'un frasco de vidrio ámbar (el Frasco de Ámbar) con una llama cálida adentro',
  gold: 'una pilita de monedas de oro'
}

function prompt(...parts: string[]): string {
  return [BASE_PROMPT, ...parts].join(' ')
}

export function buildCatalog(): Piece[] {
  const pieces: Piece[] = []

  // Heroes are puppets of three images: per outfit, the body without the arm
  // that holds the weapon and that arm on its own
  // (heroes/<id>/outfits/<outfit>/body and /arm), and each weapon
  // (heroes/<id>/weapons/<weapon>). The whole figure is their reference.
  for (const [id, look] of Object.entries(HERO_LOOKS)) {
    const batch = HERO_BATCH[id as CharacterId]
    const name = `${id[0].toUpperCase()}${id.slice(1)}`
    const reference = `Usando la imagen completa adjunta de ${name} como referencia exacta (mismo estilo, colores y proporciones)`
    const profile =
      'visto de frente en un ángulo de tres cuartos, mirando a la cámara y girado levemente hacia la derecha'
    const limb = (what: string, upper: string, lower: string) =>
      `solo ${what} de ${name}, en dos piezas separadas una al lado de la otra con mucho espacio vacío entre ellas, sin tocarse: a la izquierda ${upper}; a la derecha ${lower}. Ambas piezas perfectamente rectas y verticales, con la articulación de arriba hacia arriba, ${profile}, con los extremos redondeados en las articulaciones para que se superpongan al armarlas`

    pieces.push(
      {
        id: `heroes/${id}/full`,
        kind: 'hero',
        width: 1024,
        height: 1536,
        batch,
        prompt: prompt(
          `Personaje de cuerpo entero visto de frente en un ángulo de tres cuartos: el pecho, la panza y la cara apuntan hacia la cámara, girados levemente hacia la derecha, con los dos ojos visibles. No visto de espaldas: la espalda nunca se ve. Postura de combate con los pies separados, el arma sostenida hacia adelante con la mano derecha, cruzando por delante del cuerpo y completamente visible; el brazo izquierdo (con el escudo si el equipo tiene uno, con su frente hacia afuera) es el más cercano a la cámara. ${CARTOON_BODY} ${look}. ${FLAME}`,
          CHROMA
        )
      },
      ...Object.entries(HERO_OUTFITS[id]).flatMap(([outfit, clothes]) => {
        const part = (file: string, kind: PieceKind, what: string) => ({
          id: `heroes/${id}/outfits/${outfit}/${file}`,
          kind,
          width: 1024,
          height: kind === 'heroPart' ? 1536 : 1024,
          batch,
          prompt: prompt(`${reference}, ${what}. El equipo: ${clothes}. Sin arma.`, CHROMA)
        })

        return [
          part(
            'body',
            'heroPart',
            `el cuerpo entero de ${name} en la misma pose y vista, de la cabeza a los pies, con todo excepto el brazo derecho (el brazo que sostiene el arma): el brazo derecho queda afuera por completo y el hombro derecho termina limpio y redondeado donde se une el brazo, para poder apoyar encima un brazo separado. La cabeza, el torso, las piernas y el brazo izquierdo (con el escudo si el equipo tiene uno) están todos. ${HERO_BODIES[id]}`
          ),
          part(
            'arm',
            'heroLimb',
            limb(
              'el brazo derecho (el brazo que sostiene el arma)',
              'el brazo desde el hombro (con su hombrera) hasta el codo',
              'el antebrazo desde el codo hasta la mano, cerrada en un puño hueco como si agarrara un mango'
            )
          )
        ]
      }),
      ...Object.entries(HERO_WEAPONS[id]).map(([weapon, description]) => ({
        id: `heroes/${id}/weapons/${weapon}`,
        kind: 'weapon' as const,
        width: 2048,
        height: 512,
        batch,
        prompt: prompt(
          `${reference}, solo el arma: ${description}. Sola, de largo completo, perfectamente horizontal, apuntando a la derecha con el mango a la izquierda, vista de costado, sin mano.`,
          CHROMA
        )
      })),
      {
        id: `heroes/${id}/portrait`,
        kind: 'portrait',
        width: 512,
        height: 512,
        batch,
        prompt: prompt(
          `Retrato de busto, en vista de tres cuartos mirando a la derecha, de ${look}.`,
          'Fondo degradado suave y luminoso.'
        )
      }
    )
  }

  for (const enemy of ENEMIES) {
    const look = ENEMY_LOOKS[enemy.id]
    const boss = enemy.rarity === 'boss'

    pieces.push({
      id: `${boss ? 'bosses' : 'enemies'}/${enemy.id}`,
      kind: boss ? 'boss' : 'enemy',
      width: boss ? 1536 : 1024,
      height: boss ? 1536 : 1024,
      batch: enemy.biome,
      prompt: prompt(
        `${boss ? 'Monstruo jefe' : 'Monstruo'} de cuerpo entero${boss ? ', imponente y descomunal' : ''}, vista de costado mirando a la izquierda, listo para pelear, caricaturesco y expresivo más que aterrador. ${CARTOON_CREATURE} ${look}.`,
        CHROMA
      )
    })

    if (BOSSES_BY_PARTS.includes(enemy.id)) {
      pieces.push({
        id: `bosses/${enemy.id}-parts`,
        kind: 'bossParts',
        width: 2048,
        height: 2048,
        batch: enemy.biome,
        prompt: prompt(
          `Usando la imagen completa adjunta de esta criatura como referencia exacta (mismos colores, estilo y escala), una hoja de piezas recortables de títere para animación 2D: ${look}. No dibujes la criatura completa en ningún lado, no repitas ninguna pieza, no agregues nada que no esté en la referencia. Cada pieza aislada en una grilla limpia con mucho espacio vacío alrededor, sin que nada se toque: cabeza con mandíbula, torso, cada extremidad en dos piezas rectas, cola o alas si las tiene. Vista de costado mirando a la izquierda, con los extremos redondeados en las articulaciones para que las piezas se superpongan al armarlas.`,
          'Fondo liso y plano #00FF00.'
        )
      })
    }
  }

  for (const [biome, scenes] of Object.entries(BACKGROUNDS)) {
    scenes.forEach((scene, index) =>
      pieces.push({
        id: `backgrounds/${biome}-${index + 1}`,
        kind: 'background',
        width: 2560,
        height: 1440,
        batch: biome,
        prompt: prompt(
          `Fondo de batalla en vista lateral para un juego 2D, paisaje ancho 16:9: ${scene}. El 35% inferior es suelo plano y despejado para los combatientes, sin objetos encima. Profundidad atmosférica leve con colores claros y luminosos incluso a lo lejos, sin personajes, sin criaturas.`
        )
      })
    )
  }

  pieces.push(
    {
      id: 'backgrounds/castle',
      kind: 'background',
      width: 2560,
      height: 1440,
      batch: Biome.ABYSS,
      prompt: prompt(
        'Fondo de batalla en vista lateral para un juego 2D, ancho 16:9: el salón del trono del castillo negro del Abismo, pilares de hierro gigantes, estandartes rojos y hornos ardiendo en las paredes. El 35% inferior es piso plano y despejado para los combatientes. Sin personajes.'
      )
    },
    {
      id: 'backgrounds/crisol',
      kind: 'background',
      width: 2560,
      height: 1440,
      batch: Biome.ABYSS,
      prompt: prompt(
        'Fondo de batalla en vista lateral para un juego 2D, ancho 16:9: el corazón de una forja viviente, una vasta caverna de cascadas de metal fundido, yunques y cadenas gigantes y una luz incandescente rojo dorada. El 35% inferior es una plataforma plana de hierro negro para los combatientes. Sin personajes.'
      )
    }
  )

  for (const [biome, contents] of Object.entries(MAP_SHEETS)) {
    pieces.push({
      id: `map/${biome}-sheet`,
      kind: 'mapSheet',
      width: 2048,
      height: 2048,
      batch: biome,
      prompt: prompt(
        `Hoja de sprites de 16 decoraciones de mapa separadas en una grilla de 4 por 4, vista cenital de tres cuartos, cada una centrada en su celda con espacio vacío alrededor: ${contents}. Misma escala para todas.`,
        'Fondo liso y plano #00FF00, sin sombras sobre el fondo.'
      )
    })
  }

  for (const [biome, [tall, low, ground]] of Object.entries(SCENERY_SHEETS)) {
    pieces.push({
      id: `map/${biome}-scenery`,
      kind: 'scenerySheet',
      width: 2048,
      height: 2048,
      batch: biome,
      prompt: prompt(
        `Hoja de sprites de 16 piezas de escenografía de mapa separadas en una grilla de 4 por 4, vista cenital de tres cuartos (vista desde arriba en ángulo, como el mapa de un RPG 2D clásico), cada una parada sobre su base en la parte de abajo de su celda con espacio vacío alrededor, sin que nada se toque. Filas 1 y 2: ${tall}. Fila 3: ${low}. Fila 4: ${ground}. Misma escala para todas (un árbol mucho más alto que un arbusto, una mata mucho más chica que una roca).`,
        'Fondo liso y plano #00FF00, sin sombras, sin suelo debajo de las piezas.'
      )
    })
  }

  for (const [biome, contents] of Object.entries(PROP_SHEETS)) {
    pieces.push({
      id: `props/${biome}-sheet`,
      kind: 'propSheet',
      width: 2048,
      height: 2048,
      batch: biome,
      prompt: prompt(
        `Hoja de sprites de 12 elementos de escenografía de batalla separados para un juego 2D de vista lateral, vistos de costado a la altura de los ojos (no desde arriba), cada uno parado sobre su base con mucho espacio vacío alrededor, sin que nada se toque: ${contents}. Todos en la misma escala entre sí (un árbol mucho más alto que una roca), sin suelo debajo.`,
        'Fondo liso y plano #00FF00, sin sombras sobre el fondo.'
      )
    })
  }

  for (const [merchant, what] of MERCHANT_HOUSES) {
    pieces.push({
      id: `map/merchants/${merchant}`,
      kind: 'building',
      width: 1024,
      height: 1024,
      batch: 'map',
      prompt: prompt(
        `Un único edificio para el mapa del mundo de un juego 2D, vista cenital de tres cuartos (visto desde arriba en ángulo, como el mapa de un RPG 2D clásico), parado sobre su base en el centro con espacio vacío alrededor, sin suelo debajo: ${what}.`,
        CHROMA
      )
    })
  }

  for (const [id, contents] of SPECIAL_SHEETS) {
    pieces.push({
      id,
      kind: 'mapSheet',
      width: 2048,
      height: 2048,
      batch: 'map',
      prompt: prompt(
        `Hoja de sprites de 16 edificios especiales y lugares emblemáticos de mapa separados en una grilla de 4 por 4, vista cenital de tres cuartos, cada uno centrado en su celda, en este orden: ${contents}. Misma escala para todos.`,
        'Fondo liso y plano #00FF00.'
      )
    })
  }

  pieces.push({
    id: 'tiles/cliff',
    kind: 'tile',
    width: 1024,
    height: 1024,
    batch: 'tiles',
    prompt: [
      TILE_PROMPT,
      'Textura cuadrada repetible sin costuras de la pared vertical de un acantilado en el mapa de un juego 2D, vista de frente (sin perspectiva, sin parte de arriba, sin suelo): tierra marrón compactada y roca gris en vetas y capas verticales, algunas raíces colgantes y grietas. El patrón llena todo el cuadrado de forma pareja y continúa a través de los cuatro bordes. Luz suave y pareja desde arriba, sin marco, sin borde, sin viñeta.',
      TILE_REFERENCE
    ].join(' ')
  })

  for (const terrain of TERRAINS) {
    pieces.push({
      id: `tiles/${terrain}`,
      kind: 'tile',
      width: 1024,
      height: 1024,
      batch: 'tiles',
      prompt: [
        TILE_PROMPT,
        TILE_RULES,
        `El suelo: ${TILES[terrain]}.`,
        ...(terrain === Terrain.GRASS ? [] : [TILE_REFERENCE])
      ].join(' ')
    })
  }

  const icon = (id: string, what: string) =>
    pieces.push({
      id,
      kind: 'icon',
      width: 512,
      height: 512,
      batch: 'ui',
      prompt: prompt(
        `Ícono de juego, centrado, que ocupa el 80% del cuadrado: ${what}. Forma redondeada y gruesa, contorno grueso, aspecto brillante de juguete, se lee bien a 48 px.`,
        CHROMA
      )
    })

  for (const [id, what] of SKILL_ICONS) {
    icon(`icons/skills/${id}`, what)
  }

  for (const family of RUNE_FAMILIES) {
    icon(`icons/runes/${family}`, `una piedra rúnica tallada que muestra ${RUNE_ICONS[family]}`)
  }

  for (const [id, what] of Object.entries(ITEM_ICONS)) {
    if (!['echo', 'tear', 'flask', 'gold'].includes(id) && !ITEMS.some((item) => item.id === id)) {
      throw new Error(`Unknown item ${id}`)
    }

    icon(`icons/items/${id}`, what)
  }

  return pieces
}

/** Batches in the order they are generated. */
export const BATCHES = [...Object.values(Biome), 'tiles', 'map', 'ui']
