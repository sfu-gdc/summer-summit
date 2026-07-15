// Shared-context WebGL2 renderer for the "spray border" effect (technique 3 of
// the spray-border demo). One offscreen GL context renders every button's
// texture and blits it into each button's own 2D canvas, so a page with many
// buttons stays under the ~16-WebGL-context-per-tab ceiling.

import { converter, type Color } from 'culori';
import * as twgl from 'twgl.js';

const lrgb = converter('lrgb');

// Fullscreen triangle; the fragment shader does all the work in gl_FragCoord space.
const VS = /*glsl*/ `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

// SDF rounded-rect solid core + round-dot stipple spray in the falloff band.
const FS = /*glsl*/ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2  uResolution;   // device-px texture size
uniform vec2  uCoreHalfSize; // half-size of the solid core, device px
uniform float uRadius;       // corner radius, device px
uniform float uSpread;       // band width, device px
uniform float uDensity;      // fleck density
uniform float uSeed;
uniform float uDpr;          // device pixels per CSS px (keeps dot size DPR-stable)
uniform vec3  uColor;

// --- Spray tuning (values suffixed _CSS_PX are scaled by uDpr at their use sites) ---
const int   DOTS_PER_CELL            = 6;    // candidate dots evaluated per grid cell
const float CELL_SIZE_CSS_PX         = 2.4;  // stipple grid cell size
const float DOT_RADIUS_MIN_CSS_PX    = 0.9;  // smallest dot radius
const float DOT_RADIUS_JITTER_CSS_PX = 0.35; // extra random radius added on top of the minimum
const float MIN_EDGE_AA_PX           = 0.75; // floor on a dot's anti-aliased rim (~1 device px)
const float CORE_EDGE_INSET          = 2.5;  // core/band boundary pulled this far inside the SDF (css px in) edge
const float FALLOFF_EXPONENT         = 2.0;  // how steeply dot-survival odds drop across the band

// --- Hash salts: arbitrary offsets that give each draw an independent random stream ---
const float DOT_ID_STRIDE            = 23.0; // spacing between successive dots' hash identities
const vec2  SEED_SHIFT_SCALE         = vec2(37.0, 71.0); // per-axis grid translation per unit uSeed
const float SURVIVAL_DRAW_SALT       = 4.7;  // decorrelates the dot-survival random draw
const float RADIUS_DRAW_SALT         = 9.1;  // decorrelates the dot-radius random draw

float hash(vec2 point){
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}
vec2 hash2(vec2 point){
  return vec2(hash(point), hash(point + 71.13));
}
// Signed distance to a rounded box centered at the origin (<0 inside).
float sdRoundedBox(vec2 point, vec2 halfSize, float radius){
  vec2 cornerDist = abs(point) - halfSize + radius;
  return min(max(cornerDist.x, cornerDist.y), 0.0) + length(max(cornerDist, 0.0)) - radius;
}
void main(){
  vec2  pixel = gl_FragCoord.xy;
  vec2  boxCenter = uResolution * 0.5;
  float distToCore = sdRoundedBox(pixel - boxCenter, uCoreHalfSize, uRadius); // <0 inside core

  float coreEdge = -CORE_EDGE_INSET * (uResolution.y / (uCoreHalfSize.y * 2.0 + uSpread * 2.0));
  if(distToCore <= coreEdge){ fragColor = vec4(uColor, 1.0); return; } // solid core
  if(distToCore >  uSpread) discard;                                   // beyond the band

  // Stipple: lay a jittered grid over the band; each cell holds several
  // candidate round dots of a fixed small size. Each dot survives with a
  // probability that falls off across the band, so the *count* of dots ramps up
  // toward the core — packing tight enough to merge into solid — and thins to
  // scattered specks at the edge. Scanning the 3x3 neighborhood lets dots spill
  // across cell borders, so the underlying grid never reads as a grid.
  float cellSize  = CELL_SIZE_CSS_PX * uDpr;
  vec2  seedShift = uSeed * SEED_SHIFT_SCALE;
  vec2  grid = (pixel + seedShift) / cellSize;
  vec2  cell = floor(grid);
  vec2  frac = fract(grid);

  float cover = 0.0;
  for(int j = -1; j <= 1; j++){
    for(int i = -1; i <= 1; i++){
      for(int k = 0; k < DOTS_PER_CELL; k++){
        vec2  neighbor  = cell + vec2(float(i), float(j));
        vec2  id        = neighbor + float(k) * DOT_ID_STRIDE;             // per-dot identity
        vec2  jitter    = hash2(id);                             // dot center anywhere in cell
        vec2  dotPixel  = (neighbor + jitter) * cellSize - seedShift; // dot center, device px
        float dotCore   = sdRoundedBox(dotPixel - boxCenter, uCoreHalfSize, uRadius);
        if(dotCore <= coreEdge || dotCore > uSpread) continue;

        // Steep falloff: coverage from overlapping dots saturates, so the survival
        // odds must drop hard across the band for the thinning to actually read.
        float bandPos  = clamp((dotCore - coreEdge) / (uSpread - coreEdge), 0.0, 1.0);
        float keepProb = pow(1.0 - bandPos, FALLOFF_EXPONENT) * uDensity;
        if(hash(id + SURVIVAL_DRAW_SALT) > keepProb) continue; // this dot didn't survive

        float dotRadius = (DOT_RADIUS_MIN_CSS_PX + DOT_RADIUS_JITTER_CSS_PX * hash(id + RADIUS_DRAW_SALT)) * uDpr;

        vec2  toDot = (vec2(float(i), float(j)) + jitter - frac) * cellSize;
        float dist  = length(toDot);
        float aa    = max(fwidth(dist), MIN_EDGE_AA_PX);                   // ~1px anti-aliased rim
        cover = max(cover, 1.0 - smoothstep(dotRadius - aa, dotRadius + aa, dist));
      }
    }
  }

  if(cover <= 0.0) discard;
  fragColor = vec4(uColor, cover);
}`;

export interface RenderParams {
	/** CSS pixel size of the button's box (not the oversized canvas). */
	cssW: number;
	cssH: number;
	dpr: number;
	/** How far, in CSS px, the spray bleeds past the box. */
	spread: number;
	radius: number;
	density: number;
	seed: number;
	color: string | Color;
}

let gl: WebGL2RenderingContext | null = null;
let glCanvas: OffscreenCanvas | null = null;
let progInfo: twgl.ProgramInfo | null = null;
let fullscreenTri: twgl.BufferInfo | null = null;

// Lazy so the module is import-safe during SSR (no top-level DOM access).
function ensureGL(): boolean {
	if (gl) return true;
	glCanvas = new OffscreenCanvas(1, 1);
	// preserveDrawingBuffer: drawImage() reads a cleared buffer without it.
	gl = glCanvas.getContext('webgl2', {
		premultipliedAlpha: false,
		preserveDrawingBuffer: true,
		antialias: false,
		powerPreference: 'low-power',
	});
	if (!gl) return false;
	gl.drawingBufferColorSpace = 'display-p3';
	progInfo = twgl.createProgramInfo(gl, [VS, FS]);
	fullscreenTri = twgl.createBufferInfoFromArrays(gl, {
		p: { numComponents: 2, data: [-1, -1, 3, -1, -1, 3] },
	});
	return true;
}

/** Render the spray into `target` (a visible per-button 2D canvas). No-op if WebGL2 is missing. */
export function renderSpray(target: HTMLCanvasElement, params: RenderParams): void {
	if (!ensureGL() || !gl || !glCanvas || !progInfo || !fullscreenTri) return;

	const resolutionWidth = Math.max(1, Math.round((params.cssW + 2 * params.spread) * params.dpr));
	const resolutionHeight = Math.max(1, Math.round((params.cssH + 2 * params.spread) * params.dpr));

	const rgb = lrgb(params.color);
	if (!rgb) throw new Error(`Invalid color: ${JSON.stringify(params.color)}`);

	if (glCanvas.width !== resolutionWidth || glCanvas.height !== resolutionHeight) {
		glCanvas.width = resolutionWidth;
		glCanvas.height = resolutionHeight;
	}
	gl.viewport(0, 0, resolutionWidth, resolutionHeight); // must re-set after every resize
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.useProgram(progInfo.program);
	twgl.setBuffersAndAttributes(gl, progInfo, fullscreenTri);
	twgl.setUniforms(progInfo, {
		uResolution: [resolutionWidth, resolutionHeight],
		uCoreHalfSize: [(params.cssW / 2) * params.dpr, (params.cssH / 2) * params.dpr],
		uRadius: params.radius * params.dpr,
		uSpread: params.spread * params.dpr,
		uDensity: params.density,
		uSeed: params.seed,
		uDpr: params.dpr,
		uColor: [rgb.r, rgb.g, rgb.b],
	});
	twgl.drawBufferInfo(gl, fullscreenTri, gl.TRIANGLES);

	// Blit the shared GL canvas into the button's own 2D canvas (crisp at device px).
	if (target.width !== resolutionWidth || target.height !== resolutionHeight) {
		target.width = resolutionWidth;
		target.height = resolutionHeight;
	}
	const targetCtx = target.getContext('2d', {
		colorSpace: 'display-p3',
	});
	if (!targetCtx) return;
	targetCtx.clearRect(0, 0, resolutionWidth, resolutionHeight);
	targetCtx.drawImage(glCanvas, 0, 0);
}
