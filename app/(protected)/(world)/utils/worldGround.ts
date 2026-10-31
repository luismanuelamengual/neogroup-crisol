import { BufferImageSource, Container, Geometry, Mesh, Rectangle, Shader, Sprite, Texture } from 'pixi.js'
import { LAKES, TERRAINS } from '@/app/(protected)/(engine)/data/terrains'
import { TileMap } from '@/app/(protected)/(engine)/models/TileMap'
import { createRandom } from '@/app/(protected)/(engine)/utils/random'
import { GROUND_FRAGMENT, GROUND_VERTEX } from '@/app/(protected)/(world)/utils/groundShader'
import { GroundTextures, TerrainTexture } from '@/app/(protected)/(world)/utils/terrainTextures'

/**
 * The ground of the world map drawn from its tiles, by a shader on the GPU
 * (see groundShader.ts) over a single rectangle the size of the world: each
 * pixel takes the texture of its terrain, borders between terrains wobble with
 * an ink outline and a soft shadow, and higher tiles are plateaus with the
 * face of a cliff (or stairs, where a trail climbs) under their southern
 * border. From far (or without WebGL 2), a small picture with one pixel per
 * tile instead.
 */

/**
 * The atlas the shader reads: textures per side (the terrains, then the cliff)
 * and the side of each cell, which holds its texture (scaled to half the cell)
 * in the middle and repeated around it, so that the smaller mipmaps never
 * blend it with its neighbors.
 */
const ATLAS_COLUMNS = 4
const ATLAS_CELL = 512
/** Side of the noise that makes the borders wobble. */
const NOISE_SIZE = 512
/** Wider than this on screen (world pixels), only the picture from far is shown. */
const FAR_WIDTH = 7000

export class WorldGround extends Container {
  private readonly far = new Sprite()
  private readonly mesh: Mesh<Geometry, Shader>
  private readonly tiles: Texture
  private readonly noise: Texture
  private atlas: Texture = Texture.EMPTY
  private info: Texture = Texture.EMPTY
  private textures: TerrainTexture[] = []

  constructor(
    private readonly map: TileMap,
    textures: GroundTextures,
    /** Whether the shader can run (WebGL 2); otherwise only the picture from far is shown. */
    private readonly close = true
  ) {
    super()

    const { columns, rows, tileSize } = map
    const width = columns * tileSize
    const height = rows * tileSize

    this.tiles = tilesTexture(map)
    this.noise = noiseTexture()
    this.mesh = new Mesh({
      geometry: new Geometry({
        attributes: { aPosition: [0, 0, width, 0, width, height, 0, height] },
        indexBuffer: [0, 1, 2, 0, 2, 3]
      }),
      shader: Shader.from({
        gl: {
          name: 'world-ground',
          vertex: GROUND_VERTEX,
          fragment: GROUND_FRAGMENT,
          preferredFragmentPrecision: 'highp'
        },
        resources: {
          uTiles: this.tiles.source,
          uNoise: this.noise.source,
          uAtlas: Texture.EMPTY.source,
          uInfo: Texture.EMPTY.source,
          groundUniforms: {
            uGrid: { value: [columns, rows], type: 'vec2<f32>' },
            uTileSize: { value: tileSize, type: 'f32' }
          }
        }
      })
    })
    this.far.scale.set(tileSize)
    this.addChild(this.far, this.mesh)
    this.setTextures(textures)
  }

  /** Changes the textures (e.g. once the final art is loaded). */
  setTextures({ terrains, cliff }: GroundTextures): void {
    this.textures = TERRAINS.map((terrain) => terrains.get(terrain)!)
    this.atlas.destroy(true)
    this.info.destroy(true)
    this.atlas = atlasTexture([...this.textures, cliff])
    this.info = infoTexture(this.textures)
    this.mesh.shader!.resources.uAtlas = this.atlas.source
    this.mesh.shader!.resources.uInfo = this.info.source
    this.paintFar()
  }

  /** Close up the shader draws the ground; from far, the small picture. */
  update(visible: Rectangle): void {
    this.mesh.visible = this.close && visible.width <= FAR_WIDTH
  }

  override destroy(): void {
    for (const texture of [this.tiles, this.noise, this.atlas, this.info]) {
      texture.destroy(true)
    }

    super.destroy({ children: true })
  }

  /** From far: one pixel per tile, with the average color of its terrain, darker the lower it is (smoothed when scaled). */
  private paintFar(): void {
    const { columns, rows, terrains, heights } = this.map
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const image = context.createImageData(columns, rows)

    canvas.width = columns
    canvas.height = rows
    terrains.forEach((terrain, index) => {
      const shade = 0.82 + heights[index] * 0.08

      image.data.set([...this.textures[terrain].average.map((channel) => channel * shade), 255], index * 4)
    })
    context.putImageData(image, 0, 0)
    this.far.texture.destroy(true)
    this.far.texture = Texture.from(canvas)
  }
}

/** One pixel per tile: its terrain (index in TERRAINS), its level and whether it is paved. */
function tilesTexture({ columns, rows, terrains, heights, paved }: TileMap): Texture {
  const data = new Uint8Array(columns * rows * 4)

  terrains.forEach((terrain, index) => data.set([terrain, heights[index], paved[index] * 255, 255], index * 4))

  return new Texture({
    source: new BufferImageSource({
      resource: data,
      width: columns,
      height: rows,
      scaleMode: 'nearest',
      addressMode: 'clamp-to-edge'
    })
  })
}

/** Every texture in its cell of the atlas, with mipmaps so they do not shimmer from far. */
function atlasTexture(textures: TerrainTexture[]): Texture {
  const side = ATLAS_CELL * ATLAS_COLUMNS
  const repeat = ATLAS_CELL / 2
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!

  canvas.width = side
  canvas.height = side
  // Smoothing would blend the edges of a scaled texture with the empty space around it.
  context.imageSmoothingEnabled = false
  textures.forEach((texture, index) => {
    const image = document.createElement('canvas')
    const left = (index % ATLAS_COLUMNS) * ATLAS_CELL
    const top = Math.floor(index / ATLAS_COLUMNS) * ATLAS_CELL

    image.width = texture.size
    image.height = texture.size
    image.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(texture.data), texture.size), 0, 0)
    context.save()
    context.beginPath()
    context.rect(left, top, ATLAS_CELL, ATLAS_CELL)
    context.clip()

    for (let row = -1; row <= 1; row++) {
      for (let column = -1; column <= 1; column++) {
        context.drawImage(image, left + repeat / 2 + column * repeat, top + repeat / 2 + row * repeat, repeat, repeat)
      }
    }

    context.restore()
  })

  const texture = Texture.from(canvas)

  texture.source.style.addressMode = 'clamp-to-edge'
  texture.source.style.mipmapFilter = 'linear'
  texture.source.autoGenerateMipmaps = true
  texture.source.updateMipmaps()

  return texture
}

/** One pixel per terrain: its average color (to tint the cliffs under it) and, in alpha, whether it is a lake. */
function infoTexture(textures: TerrainTexture[]): Texture {
  const data = new Uint8Array(16 * 4)

  textures.forEach((texture, index) =>
    data.set([...texture.average.map(Math.round), LAKES.has(TERRAINS[index]) ? 255 : 0], index * 4)
  )

  return new Texture({
    source: new BufferImageSource({ resource: data, width: 16, height: 1, scaleMode: 'nearest' })
  })
}

/** Smooth random values in [0, 1] that wrap around, for the wobble of the borders. */
function noiseTexture(): Texture {
  const random = createRandom(0xb0de)
  const coarse = 32
  const values = Array.from({ length: coarse * coarse }, () => random())
  const at = (column: number, row: number) => values[(row % coarse) * coarse + (column % coarse)]
  const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4)
  const step = NOISE_SIZE / coarse

  for (let y = 0; y < NOISE_SIZE; y++) {
    for (let x = 0; x < NOISE_SIZE; x++) {
      const column = Math.floor(x / step)
      const row = Math.floor(y / step)
      const tx = x / step - column
      const ty = y / step - row
      const top = at(column, row) * (1 - tx) + at(column + 1, row) * tx
      const bottom = at(column, row + 1) * (1 - tx) + at(column + 1, row + 1) * tx
      // A little grain over the smooth hills.
      const value = (top * (1 - ty) + bottom * ty) * 0.9 + random() * 0.1

      data[(y * NOISE_SIZE + x) * 4] = Math.round(value * 255)
      data[(y * NOISE_SIZE + x) * 4 + 3] = 255
    }
  }

  return new Texture({
    source: new BufferImageSource({
      resource: data,
      width: NOISE_SIZE,
      height: NOISE_SIZE,
      scaleMode: 'linear',
      addressMode: 'repeat'
    })
  })
}
