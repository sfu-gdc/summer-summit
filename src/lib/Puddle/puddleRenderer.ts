// Rasterizes a height field into the blocky "puddle": threshold the depth into a
// binary mask at grid resolution, then nearest-neighbor upscale it to the
// display canvas. Canvas 2D with `imageSmoothingEnabled = false` gives the hard,
// axis-aligned block edges seen on the landing page — no WebGL needed.
//
// The renderer is a per-instance object: it owns one grid-resolution scratch
// canvas and reuses its ImageData across frames, reallocating only when the grid
// dimensions change. That avoids the cross-instance thrash and per-frame
// allocation of a shared global buffer.

import { type Color, rgb } from 'culori';

export interface PuddleRenderParams {
	nx: number;
	ny: number;
	height: Float32Array;
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

export function createPuddleRenderer(): PuddleRenderer {
	let scratch: OffscreenCanvas | null = null;
	let scratchCtx: OffscreenCanvasRenderingContext2D | null = null;
	let img: ImageData | null = null;

	const ensure = (nx: number, ny: number): boolean => {
		if (!scratch) {
			scratch = new OffscreenCanvas(nx, ny);
			scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
		} else if (scratch.width !== nx || scratch.height !== ny) {
			scratch.width = nx;
			scratch.height = ny;
			img = null; // dimensions changed -> reusable buffer no longer fits
		}
		if (!scratchCtx) return false;
		// On the right of `||`, TS has narrowed img to non-null (its width matched).
		if (img?.width !== nx || img.height !== ny) img = scratchCtx.createImageData(nx, ny);
		return true;
	};

	const render = (target: HTMLCanvasElement, params: PuddleRenderParams): boolean => {
		const { nx, ny, height, cssW, cssH, dpr, threshold } = params;
		const c = rgb(params.color);
		if (!c) return false;
		if (!ensure(nx, ny) || !scratch || !scratchCtx || !img) return false;

		const r = Math.round(c.r * 255);
		const g = Math.round(c.g * 255);
		const b = Math.round(c.b * 255);
		const a = Math.round((c.alpha ?? 1) * 255);

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
		const tctx = target.getContext('2d');
		if (!tctx) return false;
		tctx.imageSmoothingEnabled = false; // nearest-neighbor upscale -> crisp blocks
		tctx.clearRect(0, 0, w, h);
		tctx.drawImage(scratch, 0, 0, nx, ny, 0, 0, w, h);
		return true;
	};

	return { render };
}
