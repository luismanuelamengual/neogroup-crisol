/**
 * Parts of a biome with a look of their own (see data/zones.ts): other
 * trees, other ground, more or fewer of them. A tile outside every zone has
 * the plain look of its biome.
 */
export enum Zone {
  /** Forest: oaks in orange, red and gold over a carpet of fallen leaves. */
  AUTUMN = 'autumn',
  /** Forest: thick woods of blue-green pines only, with ferns and mossy rocks. */
  PINEWOOD = 'pinewood',
  /** Forest: a light glade of oaks in pink and white bloom, among flowers. */
  BLOSSOM = 'blossom',
  /** Forest: the lair of Morgrath, the Moss Witch, where Sera is held: withered violet trees over blighted ground. */
  WITCHWOOD = 'witchwood',
  /** Desert: the lair of Sahrak, the Scorpion King, where Brann is held: a ruined necropolis over red sand. */
  NECROPOLIS = 'necropolis',
  /** Tropical: deep jungle of dark wide trees, ferns and ruins of jade. */
  DEEP_JUNGLE = 'deepJungle',
  /** Tropical: open grove of palms over light grass and sand. */
  PALM_GROVE = 'palmGrove',
  /** Tropical: thick stands of bamboo, green and golden. */
  BAMBOO = 'bamboo',
  /** Tropical: flame trees in red, orange and violet bloom, among flowers. */
  FLAMEWOOD = 'flamewood',
  /** Tropical: a marsh of ponds and reeds among bluish trees. */
  MARSH = 'marsh',
  /** Tropical: the lair of Xalqui, the Jade Serpent, where Oren is held: a jungle temple of jade over glowing moss. */
  JADE_TEMPLE = 'jadeTemple',
  /** Mountains: the lair of the Basalt Colossus, where Ysolde is held: a dwarven hold in ruins over black basalt. */
  BASALT_HOLD = 'basaltHold',
  /** Wastelands: a mire of dark mud and murky pools among rotten trees. */
  MIRE = 'mire',
  /** Wastelands: poisoned lands with lakes of acid, broken pipes and slimy ruins. */
  TOXIC = 'toxic',
  /** Meadows: the village around its merchant, with cottages, a well, fences and fields, and fewer trees. */
  VILLAGE = 'village'
}
