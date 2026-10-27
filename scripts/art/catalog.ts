import { ENEMIES } from '@/app/(protected)/(engine)/data/enemies'
import { ITEMS } from '@/app/(protected)/(engine)/data/items'
import { RUNE_FAMILIES } from '@/app/(protected)/(engine)/data/runes'
import { Biome } from '@/app/(protected)/(engine)/models/Biome'
import { CharacterId } from '@/app/(protected)/(engine)/models/CharacterId'
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
  'Mature dark-fantasy mobile game art, bold clean black ink outlines, high-contrast cel shading with two-tone shadows, saturated colors, subtle painterly texture, strong rim light, clear readable silhouette, no text, no watermark, no signature.'
const CHROMA = 'Plain flat #00FF00 background, no ground shadow.'
const FLAME = 'A small glowing amber flame (#FFB020) embedded in the chest or the weapon.'
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
    'golden wheat meadows on rolling hills under a warm morning sky, a dirt road, a ruined stone watchtower and an old windmill far away, wildflowers',
    'a quiet farm village edge at sunset, wooden fences, haystacks and a small stone bridge over a stream'
  ],
  [Biome.FOREST]: [
    'a dark ancient forest with huge mossy trunks, roots like walls, shafts of pale light through the canopy',
    'a misty forest clearing with a circle of old standing stones overgrown with ivy and glowing mushrooms'
  ],
  [Biome.TROPICAL]: [
    'a steaming jungle with giant ferns, hanging vines and a waterfall behind, exotic magenta flowers',
    'ruins of a jade stepped temple swallowed by the jungle, carved serpent heads and turquoise pools'
  ],
  [Biome.DESERT]: [
    'endless orange dunes under a white-hot sun, half-buried colossal statue heads and bleached bones',
    'a sandstone canyon with ancient tomb doors carved into the cliffs, hanging torn banners'
  ],
  [Biome.MOUNTAINS]: [
    'a high rocky mountain pass with jagged grey peaks, a rope bridge and cyan crystals growing from the rock',
    'the great hall of an abandoned dwarven fortress carved in the mountain, giant pillars and runes'
  ],
  [Biome.SNOW]: [
    'a frozen tundra in a blizzard, snow-covered pines, a frozen lake and distant blue glaciers',
    'an ice cavern with giant blue icicles and frozen creatures trapped inside the ice walls'
  ],
  [Biome.VOLCANIC]: [
    'a volcanic wasteland of black basalt with rivers of glowing lava, ash falling and an erupting volcano behind',
    'the inside of a magma cave with a lake of lava, obsidian spikes and floating embers'
  ],
  [Biome.WASTELANDS]: [
    'a dead grey wasteland at dusk, twisted dead trees, a ruined city skyline and purple sickly sky',
    'an ancient battlefield graveyard with broken swords, tombstones, skeletons and a sickly green fog'
  ],
  [Biome.ABYSS]: [
    'the edge of the Abyss, a bottomless red chasm with chains, floating rock islands and a black castle far away',
    'the black castle courtyard of the Abyss, iron spikes, furnaces glowing red and molten metal channels'
  ]
}
/** The 16 decorations of each biome's map sheet. */
const MAP_SHEETS: Record<Biome, string> = {
  [Biome.MEADOWS]:
    '4 leafy oak trees, 2 haystacks, 2 wooden fences, 2 grey boulders, 2 wheat field patches, 1 small windmill, 1 stone well, 1 wooden signpost, 1 broken cart',
  [Biome.FOREST]:
    '6 tall dark pine and oak trees, 2 giant mushrooms, 2 mossy rocks, 2 fallen logs, 2 bushes, 1 standing stone, 1 hollow stump',
  [Biome.TROPICAL]:
    '5 palm and jungle trees, 3 giant ferns, 2 magenta flower bushes, 2 mossy rocks, 2 small jade ruins, 1 swamp pool, 1 totem',
  [Biome.DESERT]:
    '3 cacti, 3 dune ridges, 2 sandstone rocks, 2 bleached skulls, 2 broken pillars, 1 palm oasis, 1 half-buried statue head, 1 tent, 1 obelisk',
  [Biome.MOUNTAINS]:
    '4 rocky peaks, 3 pine trees, 3 grey boulders, 2 cyan crystal clusters, 2 rope bridges, 1 mine entrance, 1 dwarven statue',
  [Biome.SNOW]:
    '4 snowy pine trees, 3 ice spikes, 2 snow-covered rocks, 2 frozen ponds, 2 snowdrifts, 1 frozen statue, 1 igloo-like ruin, 1 mammoth skeleton',
  [Biome.VOLCANIC]:
    '3 small volcanoes, 3 basalt spires, 3 lava pools, 2 obsidian rocks, 2 dead burnt trees, 2 smoking vents, 1 ruined forge',
  [Biome.WASTELANDS]:
    '4 dead twisted trees, 3 tombstones, 2 broken walls, 2 bone piles, 2 broken siege machines, 1 ruined tower, 1 crooked gibbet, 1 green toxic pool',
  [Biome.ABYSS]:
    '4 jagged black rock spires, 3 chains anchored in rock, 3 red crystal shards, 2 lava cracks, 2 iron spikes, 1 skull pile, 1 broken black statue'
}
/** Battle scenery of each biome: props scattered in front of and behind the fighters (see battleScenery.ts). */
const PROP_SHEETS: Record<Biome, string> = {
  [Biome.MEADOWS]:
    '2 leafy oak trees, 1 young birch, 2 haystacks, 1 wooden fence section, 2 grey boulders, 1 wildflower bush, 1 wooden signpost, 1 broken cart wheel, 1 tree stump, 1 scarecrow',
  [Biome.FOREST]:
    '2 huge mossy oak trunks, 1 tall pine, 2 mossy rocks, 1 fallen log, 2 fern bushes, 1 cluster of glowing mushrooms, 1 hollow stump, 1 rune standing stone, 1 thorny bramble',
  [Biome.TROPICAL]:
    '2 palm trees, 1 jungle tree with hanging vines, 2 giant ferns, 1 magenta flower bush, 2 mossy rocks, 1 broken jade statue, 1 carved totem, 1 bamboo cluster, 1 fallen log',
  [Biome.DESERT]:
    '2 tall saguaro cacti, 1 dead acacia tree, 2 sandstone rocks, 1 bleached ox skull, 1 broken pillar, 1 half-buried statue head, 1 dry thorn bush, 1 clay pots pile, 1 small obelisk, 1 tattered banner pole',
  [Biome.MOUNTAINS]:
    '2 windswept pine trees, 3 grey boulders, 1 cyan crystal cluster, 1 stone cairn, 1 broken dwarven pillar, 1 mine cart, 1 dead shrub, 1 rune stone, 1 rocky outcrop',
  [Biome.SNOW]:
    '2 snowy pine trees, 1 bare frozen tree, 2 ice spikes, 2 snow-covered rocks, 1 frozen warrior statue, 1 mammoth tusk, 1 snowdrift, 1 wooden totem with frost, 1 broken sled',
  [Biome.VOLCANIC]:
    '2 dead burnt trees, 2 basalt spires, 2 obsidian rocks, 1 smoking vent, 1 cracked rock glowing with lava, 1 broken anvil, 1 charred skeleton, 1 ash-covered shrub, 1 iron brazier',
  [Biome.WASTELANDS]:
    '2 dead twisted trees, 2 tombstones, 1 broken stone wall, 1 bone pile, 1 crooked gibbet, 1 broken siege wheel, 1 rusty sword stuck in the ground, 1 dead shrub, 1 cracked statue, 1 old well',
  [Biome.ABYSS]:
    '2 jagged black rock spires, 2 red crystal shards, 1 chained pillar, 1 iron spike fence, 1 skull pile, 1 broken black statue, 1 burning brazier, 1 cracked obsidian rock, 1 hanging cage on a pole'
}
const SPECIAL_SHEETS: [string, string][] = [
  [
    'map/special-1',
    'a camp with a bonfire and tents, the same camp unlit and abandoned, a rune sanctuary shrine with a glowing stone, a closed treasure chest, an open treasure chest, a peddler cart, an alchemist tent, a blacksmith forge, a scholar tower, a threshold merchant black tent, a boss lair cave, a skull-marked boss arena, a glowing teardrop altar, a signpost, a stone bridge, a wooden bridge'
  ],
  [
    'map/special-2',
    'a jade serpent seal temple, a basalt colossus seal monolith, a hollow knight seal throne, the giant sealed gate of the Abyss with three seal sockets, the same gate open, the black castle of the Abyss, a lava bridge, an ice bridge, a moss witch hut, a scorpion king pit, a frost wyrm ice nest, an ash lord volcano throne, a ruined chapel, a lighthouse of amber flame, a starting glade with a big glowing tree, a crossroads shrine'
  ]
]
/** Skill icons: one per damage type, plus the support kinds. */
const SKILL_ICONS: [string, string][] = [
  ['slash', 'a curved sword slash'],
  ['pierce', 'an arrow piercing through'],
  ['blunt', 'a heavy hammer impact with cracks'],
  ['fire', 'a roaring flame'],
  ['ice', 'a sharp ice crystal'],
  ['lightning', 'a forked lightning bolt'],
  ['earth', 'a rising rock spike'],
  ['light', 'a radiant holy star'],
  ['darkness', 'a swirling black and violet void'],
  ['heal', 'a green leaf with a glowing drop of sap'],
  ['buff', 'an upward golden arrow over a shield'],
  ['debuff', 'a cracked shield with a downward purple arrow'],
  ['revive', 'a phoenix feather glowing amber']
]
/** Rune icons: one per family (the frame of the game shows the rank). */
const RUNE_ICONS: Record<string, string> = {
  leech: 'a blood-red fang dripping into a cup',
  ember: 'a glowing ember coal',
  wellspring: 'a spring of blue water rising',
  edge: 'a razor-sharp blade edge glinting',
  ward: 'a round warding shield of light',
  frost: 'a frozen snowflake crystal',
  vigor: 'a beating green heart with leaves',
  haste: 'a winged sandal',
  venom: 'a dripping green venom drop with a skull',
  fury: 'a roaring red beast eye',
  storm: 'a storm cloud with lightning',
  hunter: 'a target eye with an arrow'
}
const ITEM_ICONS: Record<string, string> = {
  'health-potion': 'a small round red potion bottle',
  'focus-potion': 'a small round blue potion bottle',
  antidote: 'a green vial with a leaf stopper',
  'fire-bomb': 'a round black bomb with a burning fuse and orange flames painted',
  'greater-health-potion': 'a large ornate red potion flask with gold',
  'greater-focus-potion': 'a large ornate blue potion flask with silver',
  'revive-potion': 'an amber potion with a phoenix feather inside',
  'frost-bomb': 'a round pale blue glass bomb with frost',
  elixir: 'a golden elixir flask glowing with rainbow light',
  'rough-stone': 'a rough grey smithing stone',
  'tempered-stone': 'a polished blue-grey smithing stone with veins of steel',
  'arcane-stone': 'a violet smithing stone with glowing runes',
  'abyssal-stone': 'a black-red smithing stone pulsing with molten light',
  echo: 'a translucent amber wisp shaped like a rune',
  tear: 'a single glowing silver teardrop of oblivion',
  flask: 'an amber glass flask (the Amber Flask) with a warm flame inside',
  gold: 'a small pile of gold coins'
}

function prompt(...parts: string[]): string {
  return [BASE_PROMPT, ...parts].join(' ')
}

export function buildCatalog(): Piece[] {
  const pieces: Piece[] = []

  // Heroes are puppets in strict profile: every body part of every outfit is
  // its own image (heroes/<id>/outfits/<outfit>/<part>), so outfits can be
  // mixed part by part, and every weapon too (heroes/<id>/weapons/<weapon>).
  for (const [id, look] of Object.entries(HERO_LOOKS)) {
    const batch = HERO_BATCH[id as CharacterId]
    const name = `${id[0].toUpperCase()}${id.slice(1)}`
    const reference = `Using the attached full image of ${name} as the exact reference (same style, colors and proportions)`
    const profile = 'in strict side profile facing right'
    const limb = (what: string, upper: string, lower: string) =>
      `only ${name}'s ${what}, in two separate pieces side by side with wide empty space between them, not touching: on the left ${upper}; on the right ${lower}. Both pieces perfectly straight and vertical, top joint up, ${profile}, with rounded ends at the joints so they overlap when assembled`

    pieces.push(
      {
        id: `heroes/${id}/full`,
        kind: 'hero',
        width: 1024,
        height: 1536,
        batch,
        prompt: prompt(
          `Full-body character ${profile} (pure profile: we see the right side of the body, the left arm and left leg are behind it), standing in a combat stance with feet apart, the weapon held up and forward in the right hand. ${look}. ${FLAME}`,
          CHROMA
        )
      },
      ...Object.entries(HERO_OUTFITS[id]).flatMap(([outfit, clothes]) => {
        const part = (file: string, kind: PieceKind, what: string) => ({
          id: `heroes/${id}/outfits/${outfit}/${file}`,
          kind,
          width: 1024,
          height: 1024,
          batch,
          prompt: prompt(`${reference}, ${what}. The outfit: ${clothes}. No full character, no weapon.`, CHROMA)
        })

        return [
          part(
            'head',
            'heroPart',
            `only ${name}'s head, ${profile}, cut cleanly just under the jaw and the base of the skull, without the neck (the neck belongs to the torso), wearing this outfit's headgear if it has any. ${HERO_BODIES[id]}`
          ),
          part(
            'torso',
            'heroPart',
            `only ${name}'s torso from the top of the neck (just under the jaw) to the hips, the whole neck included, ${profile}, without head, arms or legs, with the scarf, cape or cloak of the outfit if it has one`
          ),
          part(
            'right-arm',
            'heroLimb',
            limb(
              'right arm',
              'the upper arm from the shoulder (with its shoulder guard) to the elbow',
              'the forearm from the elbow to the hand, closed in a hollow fist as if gripping a handle'
            )
          ),
          part(
            'left-arm',
            'heroLimb',
            limb(
              'left arm',
              'the upper arm from the shoulder (with its shoulder guard) to the elbow',
              'the forearm from the elbow to the closed hand, with the shield or anything the outfit straps to it, seen from the inside'
            )
          ),
          part(
            'right-leg',
            'heroLimb',
            limb('right leg', 'the thigh from the hip to the knee', 'the shin from the knee to the foot with its boot')
          ),
          part(
            'left-leg',
            'heroLimb',
            limb('left leg', 'the thigh from the hip to the knee', 'the shin from the knee to the foot with its boot')
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
          `${reference}, only the weapon: ${description}. Alone, full length, perfectly horizontal, pointing right with the handle on the left, seen from the side, no hand.`,
          CHROMA
        )
      })),
      {
        id: `heroes/${id}/portrait`,
        kind: 'portrait',
        width: 512,
        height: 512,
        batch,
        prompt: prompt(`Bust portrait, three-quarter view facing right, of ${look}.`, 'Dark vignette background.')
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
        `Full-body ${boss ? 'boss monster, imposing and larger than life' : 'monster'}, side view facing left, aggressive stance. ${look}.`,
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
          `Using the attached full image of this creature as the exact reference (same colors, style and scale), a cutout puppet parts sheet for 2D animation: ${look}. Do not draw the full creature anywhere, do not repeat any part, do not add anything that is not in the reference. Each piece isolated in a clean grid with wide empty space around it, nothing touching: head with jaw, torso, each limb in two straight pieces, tail or wings if it has them. Side view facing left, rounded ends at the joints so pieces can overlap when assembled.`,
          'Plain flat #00FF00 background.'
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
          `Side-view battle background for a 2D game, wide 16:9 landscape: ${scene}. The bottom 35% is flat open ground for the fighters, with no objects on it. Soft depth haze in the distance, no characters, no creatures.`
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
        'Side-view battle background for a 2D game, wide 16:9: the throne hall of the black castle of the Abyss, giant iron pillars, red banners, furnaces burning in the walls. The bottom 35% is flat open floor for the fighters. No characters.'
      )
    },
    {
      id: 'backgrounds/crisol',
      kind: 'background',
      width: 2560,
      height: 1440,
      batch: Biome.ABYSS,
      prompt: prompt(
        'Side-view battle background for a 2D game, wide 16:9: the heart of a living forge, a vast cavern of molten metal falls, giant anvils and chains, an incandescent red-gold light. The bottom 35% is a flat platform of black iron for the fighters. No characters.'
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
        `Sprite sheet of 16 separate map decorations in a 4 by 4 grid, top-down three-quarter view, each one centered in its cell with empty space around it: ${contents}. Same scale for all.`,
        'Plain flat #00FF00 background, no shadows on the background.'
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
        `Sprite sheet of 12 separate battle scenery props for a side-view 2D game, seen from the side at eye level (not from above), each one standing on its base with wide empty space around it, nothing touching: ${contents}. All at the same scale as each other (a tree much taller than a rock), no ground under them.`,
        'Plain flat #00FF00 background, no shadows on the background.'
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
        `Sprite sheet of 16 separate special map buildings and landmarks in a 4 by 4 grid, top-down three-quarter view, each one centered in its cell, in this order: ${contents}. Same scale for all.`,
        'Plain flat #00FF00 background.'
      )
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
        `Game icon, centered, filling 80% of the square: ${what}. Strong outline, reads well at 48 px.`,
        CHROMA
      )
    })

  for (const [id, what] of SKILL_ICONS) {
    icon(`icons/skills/${id}`, what)
  }

  for (const family of RUNE_FAMILIES) {
    icon(`icons/runes/${family}`, `a carved rune stone showing ${RUNE_ICONS[family]}`)
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
export const BATCHES = [...Object.values(Biome), 'map', 'ui']
