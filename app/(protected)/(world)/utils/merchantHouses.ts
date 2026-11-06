import { Texture } from 'pixi.js'
import { loadTextures } from '@/app/(protected)/(art)/utils/art'
import { MerchantId } from '@/app/(protected)/(engine)/models/MerchantId'

/**
 * The building beside each merchant on the world map, so that the place reads
 * from far: its final art when it exists (`map/merchants/<merchant>`, see
 * `yarn art`), else a cottage of the village sheet for some of them, and otherwise a provisional one painted here in the style of the
 * scenery (flat colors, black outline), with its base at the bottom middle.
 */

const OUTLINE = '#1a120c'
const WIDTH = 170
const HEIGHT = 190
/** Where the drawings stand: the bottom of their base. */
const BASE = HEIGHT - 6

type Point = [number, number]

/** The buildings of every merchant: the final art where it exists, the provisional one otherwise. */
export async function loadMerchantHouses(): Promise<Record<MerchantId, Texture>> {
  const merchants = Object.values(MerchantId)
  const art = await loadTextures([
    ...merchants.map((merchant) => `map/merchants/${merchant}`),
    ...Object.values(MERCHANT_VILLAGE_HOUSES)
  ])

  const borrowed = (merchant: MerchantId) => {
    const id = MERCHANT_VILLAGE_HOUSES[merchant]

    return id ? art.get(id) : undefined
  }

  return Object.fromEntries(
    merchants.map((merchant) => [
      merchant,
      art.get(`map/merchants/${merchant}`) ?? borrowed(merchant) ?? paintMerchantHouse(merchant)
    ])
  ) as Record<MerchantId, Texture>
}

/**
 * The cottage of the village sheet a merchant lives in while its own
 * building has no art: the peddler, in the middle of the village of the
 * meadows. The village leaves it out of its cottages (see worldVillages).
 */
export const MERCHANT_VILLAGE_HOUSES: Partial<Record<MerchantId, string>> = {
  [MerchantId.PEDDLER]: 'map/village/1'
}

export function paintMerchantHouse(merchant: MerchantId): Texture {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  canvas.width = WIDTH
  canvas.height = HEIGHT
  context.lineJoin = 'round'
  context.lineCap = 'round'
  PAINTERS[merchant](context)

  return Texture.from(canvas)
}

const PAINTERS: Record<MerchantId, (context: CanvasRenderingContext2D) => void> = {
  [MerchantId.PEDDLER]: (context) => {
    cottage(context, { wall: '#d9a66a', side: '#a87443', roof: '#c4553a', roofDark: '#8f3426' })
    crate(context, 22, BASE + 2, 22)
    crate(context, 40, BASE + 4, 16)
    sack(context, 152, BASE)
  },
  [MerchantId.ALCHEMIST]: (context) => {
    tent(context, { cloth: '#8a5ad0', side: '#5a3494', trim: '#f2d36b' })
    bottle(context, 22, BASE, '#5fe08a')
    bottle(context, 152, BASE - 4, '#ff6fb0')
  },
  [MerchantId.SMITH]: (context) => {
    cottage(context, { wall: '#9a9ca6', side: '#666873', roof: '#565c6b', roofDark: '#363a45', glow: '#ff9a3a' })
    chimney(context, 112, 70)
    anvil(context, 24, BASE + 2)
  },
  [MerchantId.SCHOLAR]: (context) => tower(context),
  [MerchantId.THRESHOLD]: (context) => {
    tent(context, { cloth: '#3a2e44', side: '#1e1626', trim: '#d33a3a' })
    lantern(context, 154, BASE)
  }
}
/** Colors of the provisional cottages of the villages (see paintVillageHouse), and what each one has beside it. */
const VILLAGE_HOUSES: (CottageColors & { chimney?: boolean; crates?: boolean; sack?: boolean })[] = [
  { wall: '#f0dcb4', side: '#b89a6a', roof: '#d0603e', roofDark: '#963c26', chimney: true },
  { wall: '#f4f0e6', side: '#b8b2a4', roof: '#4a78c4', roofDark: '#2c4c8a', sack: true },
  { wall: '#c98c55', side: '#8f5b30', roof: '#5f9a4a', roofDark: '#3c6a2e', crates: true },
  { wall: '#f2cf6e', side: '#b8923a', roof: '#c8483a', roofDark: '#8a2c22', chimney: true },
  { wall: '#b9b4ac', side: '#7e7a72', roof: '#8a5a3a', roofDark: '#5a3822' },
  { wall: '#f2c4c0', side: '#b88a86', roof: '#8a5ab0', roofDark: '#5c3a7a', crates: true }
]

/** How many provisional cottages the villages have to choose from. */
export const VILLAGE_HOUSE_VARIANTS = VILLAGE_HOUSES.length

/** A provisional cottage of a village, in the style of the merchant houses, with its base at the bottom middle. */
export function paintVillageHouse(variant: number): Texture {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  const { chimney: smoke, crates, sack: bag, ...colors } = VILLAGE_HOUSES[variant % VILLAGE_HOUSES.length]

  canvas.width = WIDTH
  canvas.height = HEIGHT
  context.lineJoin = 'round'
  context.lineCap = 'round'

  if (smoke) {
    chimney(context, 86, 66)
  }

  cottage(context, colors)

  if (crates) {
    crate(context, 22, BASE + 2, 20)
  }

  if (bag) {
    sack(context, 150, BASE)
  }

  return Texture.from(canvas)
}

/** A filled shape (a flat color or a gradient) with the outline of the scenery. */
function shape(
  context: CanvasRenderingContext2D,
  points: Point[],
  fill: string | CanvasGradient,
  outline = true
): void {
  context.beginPath()
  points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
  context.closePath()

  if (outline) {
    context.lineWidth = 6
    context.strokeStyle = OUTLINE
    context.stroke()
  }

  context.fillStyle = fill
  context.fill()
}

/** From a lighter tone at one point to a darker one at the other: the light comes from the top left. */
function shading(
  context: CanvasRenderingContext2D,
  [x0, y0]: Point,
  [x1, y1]: Point,
  color: string,
  amount = 0.3
): CanvasGradient {
  const gradient = context.createLinearGradient(x0, y0, x1, y1)

  gradient.addColorStop(0, mixColor(color, '#ffffff', amount * 0.6))
  gradient.addColorStop(1, mixColor(color, '#000000', amount))

  return gradient
}

function mixColor(color: string, other: string, share: number): string {
  const channels = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  const a = channels(color)
  const b = channels(other)

  return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * share)).join(', ')})`
}

/** Lines in a darker tone (planks, shingles...) between two edges, each one from a point of `from` to `to`. */
function lines(context: CanvasRenderingContext2D, segments: [Point, Point][], color: string, width = 2): void {
  context.lineWidth = width
  context.strokeStyle = color
  context.beginPath()
  segments.forEach(([[x0, y0], [x1, y1]]) => {
    context.moveTo(x0, y0)
    context.lineTo(x1, y1)
  })
  context.stroke()
}

/** Points along the segment from a to b, at shares of it. */
function along([ax, ay]: Point, [bx, by]: Point, share: number): Point {
  return [ax + (bx - ax) * share, ay + (by - ay) * share]
}

interface CottageColors {
  wall: string
  side: string
  roof: string
  roofDark: string
  /** Lit windows (the forge), instead of light blue ones. */
  glow?: string
}

/** Seen from the front, a little to the left and from above: the front wall, the right one in shade and the roof. */
function cottage(context: CanvasRenderingContext2D, { wall, side, roof, roofDark, glow }: CottageColors): void {
  // How far back (and up) the house reaches, and its front wall.
  const back: Point = [42, -28]
  const left = 28
  const right = 116
  const top = BASE - 58
  const shift = ([x, y]: Point): Point => [x + back[0], y + back[1]]
  const window = glow ?? '#9fd8f0'

  // The right wall, in shade, with a window.
  shape(
    context,
    [[right, top], shift([right, top]), shift([right, BASE]), [right, BASE]],
    shading(context, [right, top], shift([right, BASE]), side, 0.25)
  )
  shape(
    context,
    [
      along([right, top + 18], shift([right, top + 18]), 0.3),
      along([right, top + 18], shift([right, top + 18]), 0.7),
      along([right, top + 36], shift([right, top + 36]), 0.7),
      along([right, top + 36], shift([right, top + 36]), 0.3)
    ],
    mixColor(window, '#000000', 0.25)
  )
  // The front wall, lit, with its planks, a door and two windows.
  shape(
    context,
    [
      [left, top],
      [right, top],
      [right, BASE],
      [left, BASE]
    ],
    shading(context, [left, top], [right, BASE], wall, 0.2)
  )
  lines(
    context,
    [14, 28, 42].map(
      (dy) =>
        [
          [left + 3, top + dy],
          [right - 3, top + dy]
        ] as [Point, Point]
    ),
    mixColor(wall, '#000000', 0.18)
  )
  shape(
    context,
    [
      [66, BASE - 36],
      [82, BASE - 36],
      [82, BASE],
      [66, BASE]
    ],
    '#5a3a20'
  )
  shape(
    context,
    [
      [38, top + 14],
      [56, top + 14],
      [56, top + 30],
      [38, top + 30]
    ],
    window
  )
  shape(
    context,
    [
      [92, top + 14],
      [108, top + 14],
      [108, top + 30],
      [92, top + 30]
    ],
    window
  )

  // The roof: the gable over the right wall, then the front slope seen from above, wider than the walls.
  const eaveLeft: Point = [left - 12, top + 4]
  const eaveRight: Point = [right + 6, top + 4]
  const rise = 54
  const ridgeLeft: Point = [eaveLeft[0] + back[0] / 2, eaveLeft[1] + back[1] / 2 - rise]
  const ridgeRight: Point = [eaveRight[0] + back[0] / 2, eaveRight[1] + back[1] / 2 - rise]

  shape(context, [[right, top], ridgeRight, shift([right, top])], side)
  shape(context, [eaveLeft, eaveRight, ridgeRight, ridgeLeft], shading(context, ridgeLeft, eaveRight, roof, 0.3))
  lines(
    context,
    [0.25, 0.5, 0.75].map(
      (share) => [along(eaveLeft, ridgeLeft, share), along(eaveRight, ridgeRight, share)] as [Point, Point]
    ),
    roofDark,
    3
  )
  // The far slope just shows over the ridge, darker.
  shape(context, [ridgeLeft, ridgeRight, shift(ridgeRight), [ridgeRight[0] + 6, ridgeRight[1] - 2]], roofDark)
}

interface TentColors {
  cloth: string
  side: string
  trim: string
}

/** A pyramid of cloth seen from the front, a little to the left and from above: the front lit, the right side in shade. */
function tent(context: CanvasRenderingContext2D, { cloth, side, trim }: TentColors): void {
  const frontLeft: Point = [30, BASE]
  const frontRight: Point = [118, BASE]
  const backRight: Point = [150, BASE - 30]
  const apex: Point = [96, BASE - 126]

  shape(context, [frontRight, backRight, apex], shading(context, apex, backRight, side, 0.2))
  shape(context, [frontLeft, frontRight, apex], shading(context, apex, frontRight, cloth, 0.3))
  // Seams of the cloth, the opening with its flaps and a stripe of trim along the bottom.
  lines(
    context,
    [0.33, 0.66].map((share) => [along(frontLeft, frontRight, share), apex] as [Point, Point]),
    mixColor(cloth, '#000000', 0.25)
  )
  shape(context, [[74, BASE], along([74, BASE], apex, 0.5), [100, BASE]], '#140c08')
  shape(context, [along(frontLeft, apex, 0.12), along(frontRight, apex, 0.12), frontRight, frontLeft], trim)
  shape(
    context,
    [along(frontRight, apex, 0.12), along(backRight, apex, 0.12), backRight, frontRight],
    mixColor(trim, '#000000', 0.35)
  )
  // A pole and a flag on the top.
  lines(context, [[apex, [apex[0], apex[1] - 26]]], OUTLINE, 4)
  shape(
    context,
    [
      [apex[0] + 2, apex[1] - 26],
      [apex[0] + 26, apex[1] - 19],
      [apex[0] + 2, apex[1] - 12]
    ],
    trim
  )
}

/** A round tower: its wall shaded from the light to the dark side, a pointed roof and a ring of stones at the top. */
function tower(context: CanvasRenderingContext2D): void {
  const cx = 84
  const radius = 34
  const top = BASE - 96
  const flat = 10
  const wall = context.createLinearGradient(cx - radius, 0, cx + radius, 0)

  wall.addColorStop(0, '#d8cdb4')
  wall.addColorStop(0.45, '#b8ad96')
  wall.addColorStop(1, '#6f6654')
  context.beginPath()
  context.moveTo(cx - radius, top)
  context.lineTo(cx - radius, BASE - flat)
  context.ellipse(cx, BASE - flat, radius, flat, 0, Math.PI, 0, true)
  context.lineTo(cx + radius, top)
  context.closePath()
  context.lineWidth = 6
  context.strokeStyle = OUTLINE
  context.stroke()
  context.fillStyle = wall
  context.fill()

  // Rows of stones that follow the round wall.
  context.lineWidth = 2
  context.strokeStyle = 'rgba(60, 50, 36, 0.45)'

  for (let row = 1; row < 5; row++) {
    context.beginPath()
    context.ellipse(cx, top + row * 22, radius - 2, flat, 0, Math.PI * 0.05, Math.PI * 0.95)
    context.stroke()
  }

  shape(
    context,
    [
      [cx - 14, BASE - 34],
      [cx + 2, BASE - 36],
      [cx + 2, BASE - 4],
      [cx - 14, BASE - 2]
    ],
    '#5a3a20'
  )
  shape(
    context,
    [
      [cx - 12, top + 26],
      [cx + 2, top + 25],
      [cx + 2, top + 46],
      [cx - 12, top + 47]
    ],
    '#ffe08a'
  )

  // The roof: a cone wider than the tower, lit on the left.
  const roof = context.createLinearGradient(cx - radius - 12, 0, cx + radius + 12, 0)

  roof.addColorStop(0, '#7aa0ea')
  roof.addColorStop(0.45, '#3a5fb8')
  roof.addColorStop(1, '#22397a')
  context.beginPath()
  context.moveTo(cx + 4, top - 70)
  context.lineTo(cx + radius + 12, top + 2)
  context.ellipse(cx, top + 2, radius + 12, flat + 4, 0, 0, Math.PI)
  context.closePath()
  context.lineWidth = 6
  context.strokeStyle = OUTLINE
  context.stroke()
  context.fillStyle = roof
  context.fill()
  shape(
    context,
    [
      [cx + 4, top - 84],
      [cx + 9, top - 75],
      [cx + 4, top - 66],
      [cx - 1, top - 75]
    ],
    '#ffe08a'
  )
  // Books piled at the door.
  book(context, cx + radius + 16, BASE + 2, '#b0472f')
  book(context, cx + radius + 18, BASE - 8, '#3a8f5a')
}

function book(context: CanvasRenderingContext2D, x: number, base: number, color: string): void {
  shape(
    context,
    [
      [x - 12, base - 10],
      [x + 8, base - 10],
      [x + 14, base - 14],
      [x - 6, base - 14]
    ],
    mixColor(color, '#ffffff', 0.3)
  )
  shape(
    context,
    [
      [x - 12, base - 10],
      [x + 8, base - 10],
      [x + 8, base],
      [x - 12, base]
    ],
    color
  )
}

function chimney(context: CanvasRenderingContext2D, x: number, top: number): void {
  shape(
    context,
    [
      [x + 18, top - 6],
      [x + 26, top - 11],
      [x + 26, top + 26],
      [x + 18, top + 30]
    ],
    '#4c4e58'
  )
  shape(
    context,
    [
      [x, top],
      [x + 18, top],
      [x + 18, top + 30],
      [x, top + 30]
    ],
    '#7a7c86'
  )
  shape(
    context,
    [
      [x, top],
      [x + 18, top],
      [x + 26, top - 6],
      [x + 8, top - 6]
    ],
    '#2a2c34'
  )

  for (const [dx, dy, r] of [
    [14, -16, 8],
    [8, -32, 10],
    [18, -50, 12]
  ]) {
    context.beginPath()
    context.arc(x + dx, top + dy, r, 0, Math.PI * 2)
    context.fillStyle = 'rgba(210, 210, 220, 0.7)'
    context.fill()
  }
}

/** A box seen like the houses: its front, its right side in shade and its lid. */
function crate(context: CanvasRenderingContext2D, x: number, base: number, side: number): void {
  const depth = side * 0.45

  shape(
    context,
    [
      [x + side / 2, base - side],
      [x + side / 2 + depth, base - side - depth * 0.66],
      [x + side / 2 + depth, base - depth * 0.66],
      [x + side / 2, base]
    ],
    '#7a5028'
  )
  shape(
    context,
    [
      [x - side / 2, base - side],
      [x + side / 2, base - side],
      [x + side / 2, base],
      [x - side / 2, base]
    ],
    '#b07c45'
  )
  shape(
    context,
    [
      [x - side / 2, base - side],
      [x + side / 2, base - side],
      [x + side / 2 + depth, base - side - depth * 0.66],
      [x - side / 2 + depth, base - side - depth * 0.66]
    ],
    '#d39a5c'
  )
}

function sack(context: CanvasRenderingContext2D, x: number, base: number): void {
  const fill = shading(context, [x - 12, base - 30], [x + 12, base], '#d8c08a', 0.3)

  shape(
    context,
    [
      [x - 6, base - 30],
      [x + 6, base - 30],
      [x + 14, base - 8],
      [x + 10, base],
      [x - 10, base],
      [x - 14, base - 8]
    ],
    fill
  )
}

function bottle(context: CanvasRenderingContext2D, x: number, base: number, color: string): void {
  shape(
    context,
    [
      [x - 4, base - 30],
      [x + 4, base - 30],
      [x + 4, base - 20],
      [x - 4, base - 20]
    ],
    '#c8d0d8'
  )
  shape(
    context,
    [
      [x - 4, base - 20],
      [x + 4, base - 20],
      [x + 13, base - 8],
      [x + 10, base],
      [x - 10, base],
      [x - 13, base - 8]
    ],
    shading(context, [x - 13, base - 20], [x + 13, base], color, 0.4)
  )
  context.fillStyle = 'rgba(255, 255, 255, 0.7)'
  context.fillRect(x - 7, base - 14, 3, 7)
}

function anvil(context: CanvasRenderingContext2D, x: number, base: number): void {
  shape(
    context,
    [
      [x - 20, base - 24],
      [x + 18, base - 24],
      [x + 24, base - 28],
      [x - 14, base - 28]
    ],
    '#6a6e7c'
  )
  shape(
    context,
    [
      [x - 20, base - 24],
      [x + 18, base - 24],
      [x + 10, base - 14],
      [x + 8, base],
      [x - 8, base],
      [x - 10, base - 14]
    ],
    '#3a3d48'
  )
}

function lantern(context: CanvasRenderingContext2D, x: number, base: number): void {
  lines(
    context,
    [
      [
        [x, base],
        [x, base - 54]
      ],
      [
        [x, base - 54],
        [x - 12, base - 54]
      ]
    ],
    OUTLINE,
    4
  )
  shape(
    context,
    [
      [x - 19, base - 50],
      [x - 5, base - 50],
      [x - 5, base - 34],
      [x - 19, base - 34]
    ],
    '#ff5a3a'
  )
  context.beginPath()
  context.arc(x - 12, base - 42, 14, 0, Math.PI * 2)
  context.fillStyle = 'rgba(255, 140, 80, 0.3)'
  context.fill()
}
