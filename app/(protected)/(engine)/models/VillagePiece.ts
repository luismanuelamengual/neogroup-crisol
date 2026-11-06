/** What stands in a village of the world map (see placeVillages). */
export enum VillagePieceKind {
  HOUSE = 'house',
  WELL = 'well',
  FENCE = 'fence',
  MILL = 'mill',
  WHEAT = 'wheat',
  HAY = 'hay',
  CART = 'cart',
  SIGN = 'sign'
}

/** A piece of a village: where its base touches the ground (world pixels), which drawing of its kind and whether mirrored. */
export interface VillagePiece {
  kind: VillagePieceKind
  x: number
  y: number
  /** Picks its drawing among the ones of its kind, in [0, 1). */
  pick: number
  flip: boolean
}

/** A village around a merchant: its pieces and the tiles of the dirt paths from the doors of its cottages to the trails, and of their yards. */
export interface Village {
  nodeId: string
  pieces: VillagePiece[]
  /** Indexes of tiles (row by row, as in TileMap). */
  paths: number[]
}
