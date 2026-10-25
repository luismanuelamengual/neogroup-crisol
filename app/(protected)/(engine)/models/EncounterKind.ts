/** What waits at a point of the map. */
export enum EncounterKind {
  COMBAT = 'combat',
  /** Fight of 3 phases that guards a sanctuary or a Tear of Oblivion. */
  ELITE = 'elite',
  /** Mini boss that guards a sanctuary (it opens no camp). */
  GUARDIAN = 'guardian',
  MINIBOSS = 'miniboss',
  CAPTOR = 'captor',
  SEAL = 'seal',
  CRISOL = 'crisol'
}
