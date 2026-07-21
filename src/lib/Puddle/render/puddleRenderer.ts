// Rasterizes a height field into the blocky "puddle": threshold the depth into a
// binary mask at grid resolution, then nearest-neighbor upscale it to the
// display canvas. Canvas 2D with `imageSmoothingEnabled = false` gives the hard,
// axis-aligned block edges seen on the landing page — no WebGL needed.
//
// The renderer is a per-instance object: it owns one grid-resolution scratch
// canvas and reuses its ImageData across frames, reallocating only when the grid
// dimensions change. That avoids the cross-instance thrash and per-frame
// allocation of a shared global buffer.

import { type Color, parse, toGamut } from 'culori';

type CanvasColorSpace = 'display-p3' | 'srgb';
type ScratchContext = OffscreenCanvasRenderingContext2D & {
	getContextAttributes?: () => CanvasRenderingContext2DSettings;
};

export interface PuddleRendererOptions {
	/** Override the preferred color space, primarily for deterministic fallback environments. */
	colorSpace?: CanvasColorSpace;
}

export interface PuddleRenderParams {
	nx: number;
	ny: number;
	height: ArrayLike<number>;
	/** CSS pixel size of the box the puddle fills. */
	cssW: number;
	cssH: number;
	dpr: number;
	/** Depth above which a cell is painted. */
	threshold: number;
	/** Puddle fill color; any CSS color string or culori Color. */
	color: string | Color;
}

export interface PuddleRenderer {
	/** Paint the thresholded, nearest-upscaled puddle into `target`. Returns false if unavailable. */
	render: (target: HTMLCanvasElement, params: PuddleRenderParams) => boolean;
}

const mapToP3 = toGamut('p3', 'oklch');
const mapToSrgb = toGamut('rgb', 'oklch');

function actualColorSpace(context: CanvasRenderingContext2D | ScratchContext): CanvasColorSpace {
	try {
		return context.getContextAttributes?.().colorSpace === 'display-p3' ? 'display-p3' : 'srgb';
	} catch {
		return 'srgb';
	}
}

function createScratchContext(
	canvas: OffscreenCanvas,
	colorSpace: CanvasColorSpace,
): ScratchContext | null {
	try {
		return canvas.getContext('2d', { colorSpace, willReadFrequently: true });
	} catch {
		return canvas.getContext('2d', { willReadFrequently: true });
	}
}

function createTargetContext(
	canvas: HTMLCanvasElement,
	colorSpace: CanvasColorSpace,
): CanvasRenderingContext2D | null {
	try {
		const context = canvas.getContext('2d', { colorSpace });
		if (context || colorSpace === 'srgb') return context;
	} catch {
		// Older canvases do not accept context color-space settings.
	}
	return canvas.getContext('2d');
}

function createPixelBuffer(
	context: ScratchContext,
	width: number,
	height: number,
	colorSpace: CanvasColorSpace,
): ImageData | null {
	try {
		const candidate = context.createImageData(width, height, { colorSpace });
		if (candidate.colorSpace === colorSpace) return candidate;
	} catch {
		// Older canvases do not accept ImageData settings.
	}
	if (colorSpace !== 'srgb') return null;
	const candidate = context.createImageData(width, height);
	return !('colorSpace' in candidate) || candidate.colorSpace === 'srgb' ? candidate : null;
}

function toByte(channel: number | undefined): number {
	const finite = Number.isFinite(channel) ? (channel ?? 0) : 0;
	return Math.round(Math.min(1, Math.max(0, finite)) * 255);
}

export function colorBytes(
	color: string | Color,
	colorSpace: CanvasColorSpace,
): readonly [number, number, number, number] | null {
	const parsed = typeof color === 'string' ? parse(color) : color;
	if (parsed === undefined) return null;
	const converted = colorSpace === 'display-p3' ? mapToP3(parsed) : mapToSrgb(parsed);
	return [
		toByte(converted.r),
		toByte(converted.g),
		toByte(converted.b),
		toByte(converted.alpha ?? 1),
	];
}

export function createPuddleRenderer(options: PuddleRendererOptions = {}): PuddleRenderer {
	let scratch: OffscreenCanvas | null = null;
	let scratchCtx: ScratchContext | null = null;
	let targetCanvas: HTMLCanvasElement | null = null;
	let targetCtx: CanvasRenderingContext2D | null = null;
	let colorSpace: CanvasColorSpace = 'srgb';
	let img: ImageData | null = null;

	const ensure = (target: HTMLCanvasElement, nx: number, ny: number): boolean => {
		if (targetCanvas !== target) {
			const preferred = options.colorSpace ?? 'display-p3';
			scratch = new OffscreenCanvas(nx, ny);
			scratchCtx = createScratchContext(scratch, preferred);
			const scratchSpace = scratchCtx ? actualColorSpace(scratchCtx) : 'srgb';
			const requested =
				preferred === 'display-p3' && scratchSpace === 'display-p3' ? preferred : 'srgb';
			targetCtx = createTargetContext(target, requested);
			colorSpace =
				requested === 'display-p3' && targetCtx && actualColorSpace(targetCtx) === 'display-p3'
					? 'display-p3'
					: 'srgb';

			if (!scratchCtx || actualColorSpace(scratchCtx) !== colorSpace) {
				scratch = new OffscreenCanvas(nx, ny);
				scratchCtx = createScratchContext(scratch, colorSpace);
			}
			targetCanvas = target;
			img = null;
		}
		if (!scratch) {
			scratch = new OffscreenCanvas(nx, ny);
			scratchCtx = createScratchContext(scratch, colorSpace);
		} else if (scratch.width !== nx || scratch.height !== ny) {
			scratch.width = nx;
			scratch.height = ny;
			img = null;
		}
		if (!scratchCtx || !targetCtx) return false;
		// On the right of `||`, TS has narrowed img to non-null (its width matched).
		if (img?.width !== nx || img.height !== ny) {
			img = createPixelBuffer(scratchCtx, nx, ny, colorSpace);
			if (!img && colorSpace === 'display-p3') {
				colorSpace = 'srgb';
				scratch = new OffscreenCanvas(nx, ny);
				scratchCtx = createScratchContext(scratch, colorSpace);
				img = scratchCtx ? createPixelBuffer(scratchCtx, nx, ny, colorSpace) : null;
			}
			if (!img) return false;
		}
		return true;
	};

	const render = (target: HTMLCanvasElement, params: PuddleRenderParams): boolean => {
		const { nx, ny, height, cssW, cssH, dpr, threshold } = params;
		if (!ensure(target, nx, ny) || !scratch || !scratchCtx || !targetCtx || !img) return false;
		const bytes = colorBytes(params.color, colorSpace);
		if (!bytes) return false;
		const [r, g, b, a] = bytes;

		const data = img.data;
		for (let k = 0; k < nx * ny; k++) {
			const o = k * 4;
			if ((height[k] ?? 0) > threshold) {
				data[o] = r;
				data[o + 1] = g;
				data[o + 2] = b;
				data[o + 3] = a; // wet: opaque fill
			} else {
				data[o + 3] = 0; // dry: transparent, so the puddle overlays the page
			}
		}
		scratchCtx.putImageData(img, 0, 0);

		const w = Math.max(1, Math.round(cssW * dpr));
		const h = Math.max(1, Math.round(cssH * dpr));
		if (target.width !== w || target.height !== h) {
			target.width = w;
			target.height = h;
		}
		targetCtx.imageSmoothingEnabled = false; // nearest-neighbor upscale -> crisp blocks
		targetCtx.clearRect(0, 0, w, h);
		targetCtx.drawImage(scratch, 0, 0, nx, ny, 0, 0, w, h);
		return true;
	};

	return { render };
}
