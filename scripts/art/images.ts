/**
 * Image operations of `yarn art` on raw RGBA pixels: removing the flat green
 * background of the generated art, trimming and finding separate parts.
 */

export interface RawImage {
  data: Uint8ClampedArray | Buffer
  width: number
  height: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Below this alpha a pixel counts as empty. */
const EMPTY_ALPHA = 16

/** Whether the corners are flat green: the image was generated over the chroma background. */
export function hasChromaBackground({ data, width, height }: RawImage): boolean {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1]

  return corners.every((pixel) => {
    const [r, g, b, a] = [data[pixel * 4], data[pixel * 4 + 1], data[pixel * 4 + 2], data[pixel * 4 + 3]]

    return a > 200 && g > 150 && g - Math.max(r, b) > 80
  })
}

/** How far a color is from the pure chroma green (0 = #00FF00). */
function chromaDistance(r: number, g: number, b: number): number {
  return Math.sqrt(r * r + (255 - g) * (255 - g) + b * b)
}

/**
 * Makes the green background transparent: the green connected to the borders
 * of the image (so the greens of the art itself stay), and anywhere the pure
 * chroma green (holes between an arm and the body). The edges get a soft alpha
 * and lose their green glow (despill). Changes `data` in place.
 */
export function removeChroma({ data, width, height }: RawImage): void {
  const background = new Uint8Array(width * height)
  const stack: number[] = []
  const isBackdrop = (pixel: number) =>
    chromaDistance(data[pixel * 4], data[pixel * 4 + 1], data[pixel * 4 + 2]) < 90 &&
    data[pixel * 4 + 1] - Math.max(data[pixel * 4], data[pixel * 4 + 2]) > 120

  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x)
  }

  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1)
  }

  while (stack.length > 0) {
    const pixel = stack.pop()!

    if (background[pixel] || !isBackdrop(pixel)) {
      continue
    }

    background[pixel] = 1

    const x = pixel % width

    if (x > 0) {
      stack.push(pixel - 1)
    }

    if (x < width - 1) {
      stack.push(pixel + 1)
    }

    if (pixel >= width) {
      stack.push(pixel - width)
    }

    if (pixel < (height - 1) * width) {
      stack.push(pixel + width)
    }
  }

  for (let pixel = 0; pixel < width * height; pixel++) {
    const index = pixel * 4
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]

    if (background[pixel] || chromaDistance(r, g, b) < 60) {
      data[index + 3] = 0
      continue
    }

    // Edges: a pixel next to the background keeps part of its alpha by how green it is.
    const x = pixel % width
    const touches =
      (x > 0 && background[pixel - 1]) ||
      (x < width - 1 && background[pixel + 1]) ||
      (pixel >= width && background[pixel - width]) ||
      (pixel < (height - 1) * width && background[pixel + width])
    const greenness = g - Math.max(r, b)

    if (touches && greenness > 20) {
      data[index + 3] = Math.round(data[index + 3] * Math.max(0.25, 1 - (greenness - 20) / 120))
      data[index + 1] = Math.max(r, b)
    }
  }
}

/** The box of the pixels that are not empty, or null when there are none. */
export function opaqueBox({ data, width, height }: RawImage, area: Box = { x: 0, y: 0, width, height }): Box | null {
  let left = Infinity
  let top = Infinity
  let right = -1
  let bottom = -1

  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      if (data[(y * width + x) * 4 + 3] > EMPTY_ALPHA) {
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    }
  }

  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

/**
 * The separate pieces of a sheet: groups of touching pixels that are not
 * empty, larger than `minShare` of the sheet, sorted top to bottom and left
 * to right.
 */
export function findParts({ data, width, height }: RawImage, minShare = 0.001): Box[] {
  const seen = new Uint8Array(width * height)
  const stack = new Int32Array(width * height)
  const boxes: Box[] = []

  for (let start = 0; start < width * height; start++) {
    if (seen[start] || data[start * 4 + 3] <= EMPTY_ALPHA) {
      continue
    }

    const found = { left: width, right: 0, top: height, bottom: 0, size: 0 }
    let pending = 0

    stack[pending++] = start
    seen[start] = 1

    while (pending > 0) {
      const pixel = stack[--pending]
      const x = pixel % width
      const y = (pixel - x) / width

      found.size++
      found.left = Math.min(found.left, x)
      found.right = Math.max(found.right, x)
      found.top = Math.min(found.top, y)
      found.bottom = Math.max(found.bottom, y)

      const neighbors = [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, pixel - width, pixel + width]

      for (const next of neighbors) {
        if (next >= 0 && next < width * height && !seen[next] && data[next * 4 + 3] > EMPTY_ALPHA) {
          seen[next] = 1
          stack[pending++] = next
        }
      }
    }

    if (found.size >= minShare * width * height) {
      boxes.push({
        x: found.left,
        y: found.top,
        width: found.right - found.left + 1,
        height: found.bottom - found.top + 1
      })
    }
  }

  // Rows: a part joins the row when it starts above the row's lowest bottom.
  const rows: { bottom: number; boxes: Box[] }[] = []

  for (const box of boxes.sort((a, b) => a.y - b.y)) {
    const row = rows.at(-1)

    if (row && box.y < row.bottom) {
      row.boxes.push(box)
      row.bottom = Math.max(row.bottom, box.y + box.height)
    } else {
      rows.push({ bottom: box.y + box.height, boxes: [box] })
    }
  }

  return rows.flatMap((row) => row.boxes.sort((a, b) => a.x - b.x))
}
