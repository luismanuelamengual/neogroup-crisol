import { Affinity } from '@/app/(protected)/(engine)/models/Affinity'
import { BossPhase } from '@/app/(protected)/(engine)/models/BossPhase'
import { DamageType } from '@/app/(protected)/(engine)/models/DamageType'
import { StatusType } from '@/app/(protected)/(engine)/models/StatusType'

/**
 * How each boss with more than one health bar changes its rules when one
 * empties, by species: the first entry acts when the first bar empties, the
 * second one when the second does. On top of it the boss still grows
 * stronger and learns its phase skills (EnemySpecies.phaseSkills). Every
 * phase leaves it at least one weakness, so there is always a way in.
 */

const { WEAK, RESIST, IMMUNE, ABSORB, NORMAL } = Affinity
const { SLASH, PIERCE, BLUNT, FIRE, ICE, LIGHTNING, EARTH, LIGHT, DARKNESS } = DamageType
/** Weapons cannot hurt it: slash, pierce and blunt. */
const PHYSICAL_IMMUNE = { [SLASH]: IMMUNE, [PIERCE]: IMMUNE, [BLUNT]: IMMUNE }
/** Long enough to last the whole bar (the statuses go away when a bar empties). */
const BAR = 99

export const BOSS_PHASES: Record<string, BossPhase[]> = {
  // Meadows and Forest: Kael fights them alone, so they only teach the idea (a new weakness to look for).
  'bandit-chief': [{ affinities: { [DARKNESS]: RESIST, [LIGHT]: WEAK } }],
  morgrath: [{ affinities: { [EARTH]: ABSORB, [ICE]: WEAK } }],
  'elder-treant': [{ affinities: { [PIERCE]: RESIST, [ICE]: WEAK } }],
  'cinder-stag': [{ affinities: { [ICE]: RESIST, [EARTH]: WEAK } }, { weaponImmune: true }],
  // Tropics.
  xalqui: [{ affinities: { [ICE]: ABSORB, [FIRE]: WEAK } }],
  'mire-witch': [
    { affinities: { [DARKNESS]: ABSORB, [LIGHT]: WEAK }, statuses: [{ type: StatusType.REGEN, turns: BAR }] }
  ],
  'swamp-hydra': [
    { affinities: { [FIRE]: ABSORB } },
    { affinities: { [ICE]: ABSORB, [FIRE]: WEAK, [LIGHTNING]: WEAK } }
  ],
  'shell-colossus': [{ shields: 3 }, { sealed: true }],
  // Desert.
  sahrak: [{ affinities: { ...PHYSICAL_IMMUNE, [LIGHTNING]: WEAK } }],
  'mummy-pharaoh': [{ sealed: true }],
  sphinx: [{ weaponImmune: true }],
  'glass-djinn': [{ affinities: PHYSICAL_IMMUNE }, { affinities: { [ICE]: WEAK, [FIRE]: ABSORB } }],
  // Mountains.
  colossus: [{ sealed: true, shields: 2 }],
  'crystal-wyrm': [{ affinities: { [BLUNT]: RESIST, [LIGHTNING]: WEAK } }],
  'storm-harpy': [
    { statuses: [{ type: StatusType.SPEED_UP, turns: BAR }] },
    { affinities: { [EARTH]: RESIST, [ICE]: WEAK } }
  ],
  'granite-warden': [{ shields: 2 }, { sealed: true }],
  // Snow.
  vorneth: [{ affinities: { [FIRE]: RESIST, [LIGHTNING]: WEAK }, shields: 1 }],
  'winter-witch': [{ weaponImmune: true }],
  'frost-reaver': [{ affinities: { [FIRE]: RESIST, [LIGHT]: WEAK } }, { weaponImmune: true }],
  // Volcanic lands.
  ignaroth: [{ affinities: { [ICE]: RESIST, [LIGHTNING]: WEAK } }],
  'fire-drake': [{ affinities: PHYSICAL_IMMUNE }],
  phoenix: [{ affinities: { [ICE]: ABSORB, [DARKNESS]: WEAK }, statuses: [{ type: StatusType.REGEN, turns: BAR }] }],
  'ashen-seraph': [{ affinities: { [LIGHT]: ABSORB, [DARKNESS]: WEAK } }, { sealed: true }],
  // Wastelands.
  vael: [{ sealed: true }],
  lich: [{ weaponImmune: true, affinities: { [FIRE]: ABSORB } }],
  'bone-dragon': [{ affinities: { [SLASH]: IMMUNE, [PIERCE]: IMMUNE }, shields: 2 }],
  'wraith-lord': [{ affinities: PHYSICAL_IMMUNE }],
  'thorn-widow': [{ affinities: { [FIRE]: ABSORB } }, { affinities: PHYSICAL_IMMUNE }],
  'storm-revenant': [{ weaponImmune: true }, { affinities: { [LIGHT]: RESIST, [FIRE]: WEAK } }],
  // Abyss.
  'abyssal-champion': [{ sealed: true }],
  'crucible-maw': [{ affinities: { [ICE]: RESIST, [LIGHTNING]: WEAK } }],
  'crucible-herald': [{ weaponImmune: true }],
  'prism-horror': [
    { affinities: { [FIRE]: ABSORB, [ICE]: WEAK } },
    { affinities: { [ICE]: ABSORB, [FIRE]: WEAK, [DARKNESS]: RESIST } }
  ],
  // Crisol: no weakness at first; then the light burns it, and at the end it seals itself.
  crisol: [
    { affinities: { [LIGHT]: WEAK, [DARKNESS]: ABSORB }, shields: 2 },
    { sealed: true, affinities: { [LIGHT]: NORMAL, [ICE]: WEAK, [LIGHTNING]: WEAK } }
  ]
}

/** The phases of a boss (none for the rest). */
export function getBossPhases(speciesId: string): BossPhase[] {
  return BOSS_PHASES[speciesId] ?? []
}
