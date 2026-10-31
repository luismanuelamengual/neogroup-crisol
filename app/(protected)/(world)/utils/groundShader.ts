/**
 * Shader of the ground of the world map (see WorldGround). Per pixel of the
 * screen: the level of the ground (the four tiles around blended, with a
 * wobbling border), then either the face of a cliff, when a higher level is
 * just above, or the terrains with their wobbling borders, outlines and
 * shadows. Sizes are in world pixels. GLSL ES 3.00 (WebGL 2), in high
 * precision: positions go up to the size of the world.
 */

export const GROUND_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vWorld;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main()
{
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;

  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vWorld = aPosition;
}
`

export const GROUND_FRAGMENT = `#version 300 es
in vec2 vWorld;
out vec4 finalColor;

// Tiles (terrain, level, paved), the atlas of textures (4 by 4: the terrains, then the cliff, each one
// in the middle half of its cell and repeated around it),
// the noise of the wobble and the average color and lake flag of each terrain.
uniform sampler2D uTiles;
uniform sampler2D uAtlas;
uniform sampler2D uNoise;
uniform sampler2D uInfo;
uniform vec2 uGrid;
uniform float uTileSize;

// World pixels per repetition of a texture; the atlas.
const float TEXTURE_SPAN = 128.0;
const float ATLAS_COLUMNS = 4.0;
const float CLIFF = 12.0;
// World pixels per value of the noise, and its side.
const float NOISE_SPAN = 4.0;
const float NOISE_SIZE = 512.0;
// Borders: how much they wobble, the width of the outline and of the shadow (in shares of a tile).
const float WOBBLE = 0.42;
const float OUTLINE = 0.05;
const float SHADOW = 0.28;
const float OUTLINE_SHADE = 0.32;
const float SHADOW_SHADE = 0.28;
// Cliffs: height of a face, of a step of the stairs and of the shadow at their foot, and how dark it gets.
const float FACE = 48.0;
const float STEP = 12.0;
const float FOOT_SHADOW = 26.0;
const float FACE_SHADE = 0.5;
const float FOOT_SHADE = 0.72;
const float RIM = 3.0;
const float FACE_TINT = 0.3;
// Stairs: how much lighter their treads are, and how dark their risers.
const float STAIR_TREAD_LIGHT = 0.22;
const float STAIR_RISER_SHADE = 0.6;

vec4 tileAt(vec2 cell)
{
  return texelFetch(uTiles, ivec2(clamp(cell, vec2(0.0), uGrid - 1.0)), 0);
}

float terrainOf(vec4 tile) { return floor(tile.r * 255.0 + 0.5); }
float levelOf(vec4 tile) { return floor(tile.g * 255.0 + 0.5); }
bool pavedAt(vec2 p) { return tileAt(floor(p / uTileSize)).b > 0.5; }

float wobble(vec2 p, float shift)
{
  // Explicit level: an implicit one would need derivatives, undefined inside the branches it is called from.
  return (textureLod(uNoise, p / (NOISE_SPAN * NOISE_SIZE) + shift, 0.0).r - 0.5) * WOBBLE;
}

// How fast the textures move across the screen, worked out once at the start of main: derivatives
// taken inside the branches below are undefined on real GPUs (where neighbor pixels take different
// branches, as along the borders between tiles), and would pick a wrong mipmap there: thin lines.
vec2 gradientX;
vec2 gradientY;

vec3 textureOf(float index, vec2 p)
{
  vec2 cell = vec2(mod(index, ATLAS_COLUMNS), floor(index / ATLAS_COLUMNS));
  vec2 uv = (cell + 0.25 + fract(p / TEXTURE_SPAN) * 0.5) / ATLAS_COLUMNS;

  return textureGrad(uAtlas, uv, gradientX, gradientY).rgb;
}

// Level of the ground at a position; edge: how far inside the border of the highest level around it.
float levelAt(vec2 p, out float edge)
{
  vec2 uv = p / uTileSize - 0.5;
  vec2 corner = floor(uv);
  vec2 f = uv - corner;
  float h00 = levelOf(tileAt(corner));
  float h10 = levelOf(tileAt(corner + vec2(1.0, 0.0)));
  float h01 = levelOf(tileAt(corner + vec2(0.0, 1.0)));
  float h11 = levelOf(tileAt(corner + vec2(1.0, 1.0)));
  float low = min(min(h00, h10), min(h01, h11));
  float high = max(max(h00, h10), max(h01, h11));

  edge = 1.0;

  if (high == low) {
    return low;
  }

  float w = wobble(p, 0.5);

  for (int step = 0; step < 3; step++) {
    float level = high - float(step);

    if (level <= low) {
      break;
    }

    float amount = (h00 >= level ? (1.0 - f.x) * (1.0 - f.y) : 0.0)
      + (h10 >= level ? f.x * (1.0 - f.y) : 0.0)
      + (h01 >= level ? (1.0 - f.x) * f.y : 0.0)
      + (h11 >= level ? f.x * f.y : 0.0);

    edge = amount + w - 0.5;

    if (edge >= 0.0) {
      return level;
    }
  }

  return low;
}

float levelAt(vec2 p)
{
  float edge;

  return levelAt(p, edge);
}

// The face of a cliff (or stairs, where a trail comes down from the plateau).
vec3 face(vec2 p, float level)
{
  // How far below the rim: the smallest climb that reaches the plateau.
  float below = 0.0;
  float above = FACE;

  for (int step = 0; step < 6; step++) {
    float middle = (below + above) * 0.5;

    if (levelAt(p - vec2(0.0, middle)) > level) {
      above = middle;
    } else {
      below = middle;
    }
  }

  vec2 rim = p - vec2(0.0, above + 1.0);
  float plateau = terrainOf(tileAt(floor(rim / uTileSize)));

  // Stairs only where the trail itself crosses the step (paved above and below).
  if (pavedAt(rim) && pavedAt(p)) {
    // Each step: an ink line at its edge, a light tread and a dark riser.
    float step = mod(above, STEP);
    bool ink = above < RIM || step < 1.5;
    bool tread = step < STEP * 0.6;
    float shade = ink ? OUTLINE_SHADE : (tread ? 1.0 : STAIR_RISER_SHADE);
    float light = ink || !tread ? 0.0 : STAIR_TREAD_LIGHT;

    return mix(textureOf(plateau, p), vec3(1.0), light) * shade;
  }

  vec3 tint = texelFetch(uInfo, ivec2(int(plateau), 0), 0).rgb;
  float shade = above < RIM || above > FACE - RIM ? OUTLINE_SHADE : 1.0 - FACE_SHADE * (above / FACE);

  return mix(textureOf(CLIFF, p), tint, FACE_TINT) * shade;
}

// The terrains at a position, with their wobbling borders, outlines and shadows.
vec3 terrains(vec2 p)
{
  vec2 uv = p / uTileSize - 0.5;
  vec2 corner = floor(uv);
  vec2 f = uv - corner;
  float t[4];
  float weights[4];

  t[0] = terrainOf(tileAt(corner));
  t[1] = terrainOf(tileAt(corner + vec2(1.0, 0.0)));
  t[2] = terrainOf(tileAt(corner + vec2(0.0, 1.0)));
  t[3] = terrainOf(tileAt(corner + vec2(1.0, 1.0)));

  if (t[0] == t[1] && t[0] == t[2] && t[0] == t[3]) {
    return textureOf(t[0], p);
  }

  weights[0] = (1.0 - f.x) * (1.0 - f.y);
  weights[1] = f.x * (1.0 - f.y);
  weights[2] = (1.0 - f.x) * f.y;
  weights[3] = f.x * f.y;

  // Each terrain here scores how much of it there is, plus its own wobble: the best one shows. The
  // scores change smoothly (a corner weighs nothing at the edge of its cell), so every border between
  // two terrains wobbles and meets its neighbors, even where three or four of them meet.
  float terrain = t[0];
  float best = -9.0;
  float runnerUp = t[0];
  float second = -9.0;

  for (int corner = 0; corner < 4; corner++) {
    float amount = 0.0;

    for (int other = 0; other < 4; other++) {
      amount += t[other] == t[corner] ? weights[other] : 0.0;
    }

    // Two wobbles meet at each border: a bit more of each, so that it wobbles as much as a level does.
    float score = amount + wobble(p, t[corner] * 0.37) * 1.4;

    if (t[corner] == terrain && corner > 0) {
      continue;
    } else if (score > best) {
      runnerUp = terrain;
      second = best;
      terrain = t[corner];
      best = score;
    } else if (score > second && t[corner] != terrain) {
      runnerUp = t[corner];
      second = score;
    }
  }

  // How far inside its border, as in a share of a tile.
  float inside = (best - second) * 0.5;
  bool lake = texelFetch(uInfo, ivec2(int(terrain), 0), 0).a > 0.5;
  float shade = 1.0;

  // The upper terrain (later in the list) keeps the outline; lakes sink, the rest stands out.
  if (terrain > runnerUp && inside < OUTLINE) {
    shade = OUTLINE_SHADE;
  } else if (terrain > runnerUp && lake && inside < SHADOW) {
    shade = 1.0 - SHADOW_SHADE * (1.0 - inside / SHADOW);
  } else if (terrain < runnerUp && inside < SHADOW && texelFetch(uInfo, ivec2(int(runnerUp), 0), 0).a < 0.5) {
    shade = 1.0 - SHADOW_SHADE * (1.0 - inside / SHADOW);
  }

  return textureOf(terrain, p) * shade;
}

void main()
{
  // Gradients of the unwrapped position (no seam where a texture repeats), scaled to a cell of the atlas.
  vec2 repeat = vWorld / TEXTURE_SPAN;
  float scale = 0.5 / ATLAS_COLUMNS;

  gradientX = dFdx(repeat) * scale;
  gradientY = dFdy(repeat) * scale;

  float edge;
  float level = levelAt(vWorld, edge);
  vec3 color;
  float shade = 1.0;

  if (levelAt(vWorld - vec2(0.0, FACE)) > level) {
    color = face(vWorld, level);
  } else {
    color = terrains(vWorld);

    if (levelAt(vWorld - vec2(0.0, FACE + FOOT_SHADOW)) > level) {
      // The foot of a cliff, in its shadow.
      shade = FOOT_SHADE;
    } else if (edge >= 0.0 && edge < OUTLINE && !pavedAt(vWorld)) {
      // The rim of a plateau (a trail just slopes).
      shade = OUTLINE_SHADE;
    } else if (edge < 0.0 && edge > -SHADOW) {
      shade = 1.0 - SHADOW_SHADE * (1.0 + edge / SHADOW);
    }
  }

  finalColor = vec4(color * shade, 1.0);
}
`
