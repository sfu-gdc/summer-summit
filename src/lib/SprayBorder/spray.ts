import type { Attachment } from 'svelte/attachments';

import { parse } from 'culori';

import { renderSpray, type RenderParams } from './sprayRenderer';

/**
 * Drives the shared WebGL spray renderer for the `<canvas>` it's attached to.
 * Re-runs whenever `params` changes (size, dpr, color, or any knob).
 */
export function spray(params: RenderParams): Attachment<HTMLCanvasElement> {
	return (canvas) => {
		// culori's parse only takes strings; a Color object is already parsed. parse returns undefined for unparseable input.
		const color = typeof params.color === 'string' ? parse(params.color) : params.color;
		if (!color) {
			console.warn('<SprayBorder> invalid color', params.color);
			return;
		}
		renderSpray(canvas, { ...params, color });
	};
}
