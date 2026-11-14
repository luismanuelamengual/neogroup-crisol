/**
 * Shadow at the feet of each figure, adjustable one by one (heroes, enemies and bosses).
 *
 * The key is the figure's art id ('heroes/<id>/full', 'enemies/<id>', 'bosses/<id>').
 * - x, y: shift in pixels of a fighter of size 1 (positive x to the right, positive y down).
 * - width, height: multiplies the base ellipse (1 = as it is; 2 = twice as wide or tall).
 *
 * Every figure has its entry, measured from the feet of its art (the contact width and
 * where it stands); the big ones get a slightly taller ellipse. Figures without an
 * entry get the base shadow. Check it in /dev/art.
 */
export interface ShadowAdjust {
  x?: number
  y?: number
  width?: number
  height?: number
}

/** Radii of the base ellipse, in pixels of a fighter of size 1. */
export const SHADOW_RADIUS = { x: 40, y: 10 }

export const SHADOW_ALPHA = 0.35

export const SHADOWS: Record<string, ShadowAdjust> = {
  // Heroes (in battle they are puppets: adjust them looking at the puppet in /dev/art)
  'heroes/brann/full': { x: 1, width: 1.05 },
  'heroes/kael/full': { x: 8, width: 1.15 },
  'heroes/oren/full': { x: 2, width: 0.85 },
  'heroes/sera/full': { x: 6, width: 0.95 },
  'heroes/ysolde/full': { x: 5, width: 0.85 },

  // Enemies
  'enemies/abyss-eye': { x: -10 },
  'enemies/abyssal-knight': { x: 6, width: 1.15, height: 1.05 },
  'enemies/ash-wraith': { x: 12, width: 0.9 },
  'enemies/bandit-archer': { x: 7 },
  'enemies/banshee': { x: 15, width: 0.85 },
  'enemies/bog-wight': { x: 22, width: 0.75 },
  'enemies/bone-knight': { x: 16 },
  'enemies/carnivorous-plant': { x: 15 },
  'enemies/carrion-crow': { x: -11, width: 1.2, height: 1.05 },
  'enemies/castle-warden': { x: 1, width: 1.1, height: 1.05 },
  'enemies/cave-bat': { x: -6, width: 1.05 },
  'enemies/chaos-spawn': { x: -5 },
  'enemies/creeping-vine': { x: 12, width: 0.75 },
  'enemies/crucible-horror': { x: 5, width: 1.15, height: 1.05 },
  'enemies/crucible-priest': { x: -2, width: 1.1, height: 1.05 },
  'enemies/crystal-sprite': { x: -8, width: 1.2, height: 1.05 },
  'enemies/cursed-stag': { x: 6, width: 1.2, height: 1.05 },
  'enemies/desert-djinn': { x: 2, width: 0.75 },
  'enemies/devourer': { x: 6, width: 1.15, height: 1.05 },
  'enemies/dune-raider': { x: 5, width: 1.05 },
  'enemies/dwarf-runepriest': { x: 1, width: 1.15, height: 1.05 },
  'enemies/field-rat': { x: 2, width: 1.1 },
  'enemies/fire-imp': { x: -5, width: 0.95 },
  'enemies/flame-priest': { x: -8, width: 1.05 },
  'enemies/flesh-golem': { width: 1.3, height: 1.1 },
  'enemies/forest-goblin': { x: 14, width: 1.05 },
  'enemies/frost-giant': { width: 1.2, height: 1.05 },
  'enemies/frost-wolf': { x: 10, width: 1.15, height: 1.05 },
  'enemies/frozen-shaman': { x: -3, width: 0.95 },
  'enemies/fungal-shaman': { x: -10, width: 0.85 },
  'enemies/ghoul': { x: 9, width: 1.05 },
  'enemies/giant-mosquito': { x: 5, width: 1.15, height: 1.05 },
  'enemies/giant-scorpion': { x: -14, width: 1.2, height: 1.05 },
  'enemies/giant-toad': { width: 2.3, height: 1.4 },
  'enemies/grave-priest': { x: -1, width: 1.05 },
  'enemies/harpy': { x: -7, width: 1.15, height: 1.05 },
  'enemies/hedge-sprite': { x: 4, width: 1.1 },
  'enemies/hellhound': { x: 3, width: 1.5, height: 1.2 },
  'enemies/hollow-archer': { x: 7, width: 0.95 },
  'enemies/ice-wisp': { x: -4, width: 0.75 },
  'enemies/ice-wraith': { x: 6, width: 0.9 },
  'enemies/jade-viper': { x: 2, width: 1.05 },
  'enemies/jungle-panther': { x: -1, width: 1.65, height: 1.25 },
  'enemies/lava-golem': { x: 1, width: 1.15, height: 1.05 },
  'enemies/lizard-warrior': { x: 1, width: 1.1, height: 1.05 },
  'enemies/magma-elemental': { x: 5, width: 1.15, height: 1.05 },
  'enemies/mangrove-croc': { x: 12, width: 1.65, height: 1.25 },
  'enemies/meadow-wasp': { x: -14, width: 1.25 },
  'enemies/molten-horror': { x: -2, width: 1.15, height: 1.05 },
  'enemies/moss-bear': { x: 14, width: 1.5, height: 1.2 },
  'enemies/mountain-troll': { x: -1, width: 1.3, height: 1.1 },
  'enemies/obsidian-knight': { x: 7, width: 1.15, height: 1.05 },
  'enemies/plague-rat': { x: -3, width: 1.1, height: 1.05 },
  'enemies/polar-bear': { x: 5, width: 1.35, height: 1.1 },
  'enemies/renegade-dwarf': { x: -9, width: 1.1, height: 1.05 },
  'enemies/road-bandit': { x: 4 },
  'enemies/rock-golem': { x: 2, width: 1.25, height: 1.1 },
  'enemies/rotten-ent': { x: 10, width: 1.2, height: 1.05 },
  'enemies/salamander': { x: -4, width: 1.95, height: 1.35 },
  'enemies/sand-worm': { x: 5, width: 1.3, height: 1.1 },
  'enemies/scarab-swarm': { x: 4, width: 1.3, height: 1.1 },
  'enemies/scarecrow': { x: 10 },
  'enemies/shadow-stalker': { x: 5, width: 1.05 },
  'enemies/shadow-wolf': { x: -6, width: 1.2, height: 1.05 },
  'enemies/snow-harpy': { x: -3, width: 1.15, height: 1.05 },
  'enemies/snow-troll': { x: 8, width: 1.25, height: 1.1 },
  'enemies/stone-basilisk': { x: -1, width: 2.1, height: 1.4 },
  'enemies/storm-eagle': { x: -16 },
  'enemies/sun-priest': { x: -9, width: 0.95 },
  'enemies/thorn-boar': { x: -4, width: 1.75, height: 1.3 },
  'enemies/thorn-dryad': { x: 9, width: 0.9 },
  'enemies/tomb-guardian': { x: 10, width: 1.15, height: 1.05 },
  'enemies/toxic-frog': { x: 18, width: 1.7, height: 1.25 },
  'enemies/tribal-witch': { x: -3 },
  'enemies/void-weaver': { x: -1, width: 1.9, height: 1.3 },
  'enemies/vulture': { x: 4, width: 1.25, height: 1.1 },
  'enemies/wandering-mummy': { x: 11, width: 1.2, height: 1.05 },
  'enemies/weaver-spider': { x: 2, width: 1.7, height: 1.25 },
  'enemies/wheat-spirit': { x: 3, width: 0.8 },
  'enemies/yeti': { width: 1.15, height: 1.05 },
  'enemies/young-dragon': { x: 3, width: 1.4, height: 1.15 },

  // Bosses
  'bosses/abyssal-champion': { x: -3 },
  'bosses/alpha-wolf': { x: -3, width: 1.45, height: 1.15 },
  'bosses/ancient-mammoth': { x: 3, width: 1.45, height: 1.15 },
  'bosses/ashen-seraph': { x: -10, width: 1.15, height: 1.05 },
  'bosses/bandit-chief': { x: 16, width: 1.15 },
  'bosses/boar-matriarch': { x: 4, width: 1.65, height: 1.3 },
  'bosses/bone-dragon': { x: 3, width: 1.2, height: 1.05 },
  'bosses/cinder-stag': { width: 1.3, height: 1.1 },
  'bosses/colossus': { x: -1, width: 1.15, height: 1.05 },
  'bosses/crisol': { x: 1, width: 1.15, height: 1.05 },
  'bosses/crucible-herald': { x: -3, width: 1.05 },
  'bosses/crucible-maw': { x: -3, width: 1.15, height: 1.05 },
  'bosses/crystal-wyrm': { x: 9, width: 1.1, height: 1.05 },
  'bosses/death-knight': { width: 1.05 },
  'bosses/dune-wyrm': { x: 3 },
  'bosses/dwarf-warlord': { x: -3 },
  'bosses/elder-treant': { x: -2, width: 1.25, height: 1.1 },
  'bosses/ember-sentinel': { x: -1, width: 1.2, height: 1.05 },
  'bosses/fire-drake': { x: -6, width: 1.15, height: 1.05 },
  'bosses/frost-reaver': { x: 2, width: 1.25, height: 1.1 },
  'bosses/frost-sentinel': { x: 3, width: 1.1, height: 1.05 },
  'bosses/glass-djinn': { width: 0.75 },
  'bosses/granite-warden': { x: -6, width: 1.2, height: 1.05 },
  'bosses/ice-troll-king': { x: 2, width: 1.05 },
  'bosses/ignaroth': { x: -9, width: 1.15, height: 1.05 },
  'bosses/jaguar-king': { width: 1.4, height: 1.15 },
  'bosses/lich': { x: 4, width: 1.2, height: 1.05 },
  'bosses/magma-behemoth': { x: 2, width: 1.55, height: 1.2 },
  'bosses/mire-witch': { x: -2, width: 1.1, height: 1.05 },
  'bosses/morgrath': { x: 7, width: 1.35, height: 1.1 },
  'bosses/moss-golem': { x: -3, width: 1.25, height: 1.1 },
  'bosses/mummy-pharaoh': { x: 3 },
  'bosses/old-scarecrow': { x: 3, width: 1.15 },
  'bosses/phoenix': { x: -3, width: 1.25, height: 1.1 },
  'bosses/prism-horror': { x: 1, width: 1.15, height: 1.05 },
  'bosses/rune-golem': { x: -4, width: 1.2, height: 1.05 },
  'bosses/sahrak': { x: 1, width: 1.4, height: 1.15 },
  'bosses/sand-titan': { x: -1, width: 1.3, height: 1.1 },
  'bosses/shell-colossus': { x: -1, width: 1.55, height: 1.2 },
  'bosses/sphinx': { x: -7, width: 1.3, height: 1.1 },
  'bosses/spider-queen': { x: 4, width: 1.25, height: 1.1 },
  'bosses/storm-harpy': { x: -14, width: 1.1, height: 1.05 },
  'bosses/storm-revenant': { x: -10, width: 1.05 },
  'bosses/swamp-hydra': { width: 1.4, height: 1.15 },
  'bosses/temple-serpent': { x: -3, width: 1.25, height: 1.1 },
  'bosses/thorn-widow': { x: 3, width: 1.4, height: 1.15 },
  'bosses/thunder-roc': { x: -11, width: 1.05 },
  'bosses/vael': { x: 6, width: 1.1, height: 1.05 },
  'bosses/void-sentinel': { x: -1, width: 1.25, height: 1.1 },
  'bosses/vorneth': { x: -1, width: 1.1, height: 1.05 },
  'bosses/wasp-queen': { x: -11, width: 1.4, height: 1.15 },
  'bosses/winter-witch': { width: 1.45, height: 1.15 },
  'bosses/wraith-lord': { x: -1, width: 1.05 },
  'bosses/xalqui': { x: -2, width: 1.2, height: 1.05 }
}

/** Center and radii of a figure's shadow, in pixels of a fighter of size 1. */
export function shadowOf(artId: string): { x: number; y: number; radiusX: number; radiusY: number } {
  const adjust = SHADOWS[artId] ?? {}

  return {
    x: adjust.x ?? 0,
    y: adjust.y ?? 0,
    radiusX: SHADOW_RADIUS.x * (adjust.width ?? 1),
    radiusY: SHADOW_RADIUS.y * (adjust.height ?? 1)
  }
}
