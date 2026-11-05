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
  WITCHWOOD = 'witchwood'
}
