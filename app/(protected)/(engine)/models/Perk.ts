/**
 * The special effects of the runes (and their echoes), each one with a value
 * (a share, some turns or 1 for an on/off effect). The same perk from two
 * sources adds up. See utils/battle.ts for when each one acts.
 */
export enum Perk {
  /** The first hit of each battle: extra damage. */
  FIRST_STRIKE = 'firstStrike',
  /** Share of the maximum focus added at the start of the battle. */
  START_FOCUS = 'startFocus',
  /** Share of the maximum health recovered at the start of each of its first 3 turns. */
  OPENING_REGEN = 'openingRegen',
  /** Turns of a buff it starts the battle with. */
  START_ATTACK_UP = 'startAttackUp',
  START_DEFENSE_UP = 'startDefenseUp',
  START_SPEED_UP = 'startSpeedUp',
  /** Extra damage on burning or frozen enemies. */
  BURN_HUNTER = 'burnHunter',
  FROST_BREAKER = 'frostBreaker',
  /** Share of its maximum health / focus recovered on defeating an enemy. */
  KILL_HEAL = 'killHeal',
  KILL_FOCUS = 'killFocus',
  /** Share of its maximum focus recovered on a critical hit (once per turn). */
  CRIT_FOCUS = 'critFocus',
  /** Share of its maximum focus recovered on using an item. */
  ITEM_FOCUS = 'itemFocus',
  /** Extra damage while at full health. */
  FULL_HEALTH = 'fullHealth',
  /** The weapon attack hits twice, each hit at this share of the power. */
  DOUBLE_STRIKE = 'doubleStrike',
  /** Extra turns of the burns it leaves. */
  LONG_BURN = 'longBurn',
  /** Share of its maximum focus recovered on leaving a status on an enemy (once per turn). */
  STATUS_FOCUS = 'statusFocus',
  /** Extra damage per turn of its own, up to 5 turns. */
  WARM_UP = 'warmUp',
  /** Extra damage until it takes its first hit. */
  UNTOUCHED = 'untouched',
  /** Extra damage below 15% of its health. */
  LAST_BREATH = 'lastBreath',
  /** Extra critical chance below 30% of its health. */
  LOW_HEALTH_CRIT = 'lowHealthCrit',
  /** Turns of raised defense the first time it falls below half its health. */
  SOS = 'sos',
  /** Its hits on stunned or frozen enemies are always critical. */
  CONTROLLED_CRIT = 'controlledCrit',
  /** Turns of bleeding its critical hits leave. */
  CRIT_BLEED = 'critBleed',
  /** Extra share of the healing it receives. */
  HEALING_RECEIVED = 'healingReceived',
  /** Share of the healing it gives to an ally that it also receives. */
  HEAL_SHARE = 'healShare',
  /** Turns of raised attack it gives to the ally it heals. */
  HEAL_BUFF = 'healBuff',
  /** Extra critical chance on enemies with a harmful status. */
  CRIT_VS_DEBUFFED = 'critVsDebuffed',
  /** The weapon attack deals this element instead of physical damage. */
  FIRE_WEAPON = 'fireWeapon',
  ICE_WEAPON = 'iceWeapon',
  LIGHTNING_WEAPON = 'lightningWeapon',
  /** Chance of striking back with its weapon when an enemy hits it. */
  COUNTER = 'counter',
  /** Immunities. */
  IMMUNE_DOTS = 'immuneDots',
  IMMUNE_CONTROL = 'immuneControl',
  IMMUNE_BLIND = 'immuneBlind',
  /** Share added to the damage it deals / takes (can be negative). */
  DAMAGE_DEALT = 'damageDealt',
  DAMAGE_TAKEN = 'damageTaken',
  /** It cannot be healed (regeneration and lifesteal included). */
  NO_HEALING = 'noHealing',
  /** Each hit deals half or double damage. */
  COIN = 'coin',
  /** Once per battle it survives a deadly hit with 1 health. */
  SURVIVE = 'survive',
  /** Once per battle it rises with this share of its health when it falls. */
  SECOND_FLAME = 'secondFlame',
  /** When it falls: share of the health of its allies healed. */
  MARTYR = 'martyr',
  /** When it falls: turns of raised attack for its allies. */
  WRATH = 'wrath',
  /** When it falls: damage to every enemy, times its attack. */
  LAST_BLAST = 'lastBlast',
  /** When it falls: its allies recover all their health and focus. */
  LEGACY = 'legacy',
  /** When it falls: a shield for each ally that has none. */
  SHELTER = 'shelter',
  /** Extra damage (and raised speed) while it is the only hero standing. */
  LONE_WOLF = 'loneWolf',
  /** Extra damage while the three heroes of the front stand. */
  TEAMWORK = 'teamwork',
  /** Extra damage per special in a row (no weapon attack in between), up to 4. */
  FRENZY = 'frenzy',
  /** Share of focus its specials save. */
  ECONOMY = 'economy',
  /** Share of its maximum focus recovered at the start of each turn. */
  TURN_FOCUS = 'turnFocus',
  /** It always acts first at the start of the battle. */
  DAWN = 'dawn',
  /** Initiative gained on defeating an enemy. */
  LIGHTNING = 'lightning',
  /** Every third special deals double damage. */
  THIRD_SPECIAL = 'thirdSpecial',
  /** After a critical hit, the next hit that is not critical deals double damage. */
  COUNTERPOINT = 'counterpoint',
  /** Extra damage of the poison, burns and bleeding it leaves. */
  FEVER = 'fever',
  /** Defeating a poisoned enemy passes the poison to another one. */
  PLAGUE = 'plague',
  /** It starts the battle with a barrier that stops the first hit. */
  BARRIER = 'barrier',
  /** Healing an ally gives it a barrier. */
  AEGIS = 'aegis',
  /** Turns of lowered defense a hit on a weakness leaves. */
  BREACH = 'breach',
  /** Extra turns of the buffs it receives. */
  PERSISTENCE = 'persistence',
  /** Extra damage of its specials while its focus is full. */
  FULL_CUP = 'fullCup',
  /** It always acts twice in a row, dealing this share less damage. */
  TWIN = 'twin',
  /** At the start of its turn it recovers all its health if it took no damage since its last turn. */
  PERFECT_INSTANT = 'perfectInstant',
  /** Its hits ignore resistances: resisted hits deal normal damage and immune ones half. */
  VOID_PIERCE = 'voidPierce',
  /** Extra damage per status (good or bad) on it. */
  CRUCIBLE = 'crucible',
  /** Defeating an enemy lets it act again right away (once per turn). */
  ECLIPSE = 'eclipse',
  /** Every fifth hit: this much extra damage. */
  JUDGMENT = 'judgment'
}
