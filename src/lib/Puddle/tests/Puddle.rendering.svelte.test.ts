import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Puddle from '../Puddle.svelte';
import { alphaAt, rgbaAt, waitForPaintedFraction } from './canvas';

test('renders a thresholded puddle silhouette', async () => {
	await render(Puddle, {
		props: { animated: false, color: '#141414', style: 'width:760px;height:420px;' },
	});
	const canvas = document.querySelector('canvas');
	expect(canvas).not.toBeNull();
	if (!canvas) return;

	const fraction = await waitForPaintedFraction(canvas, 120);

	// A puddle covers a chunk of the box but leaves green around it.
	expect(fraction).toBeGreaterThan(0.1);
	expect(fraction).toBeLessThan(0.9);
	// Opaque in the middle, transparent in the corners => a rounded blob, not a filled rectangle.
	expect(alphaAt(canvas, 0.5, 0.5)).toBeGreaterThan(0);
	expect(alphaAt(canvas, 0.02, 0.03)).toBe(0);
	expect(alphaAt(canvas, 0.98, 0.97)).toBe(0);
});

test('accepts a culori Color object for `color`', async () => {
	await render(Puddle, {
		props: {
			animated: false,
			color: { mode: 'rgb', r: 1, g: 0, b: 0 },
			style: 'width:760px;height:420px;',
		},
	});
	const canvas = document.querySelector('canvas');
	expect(canvas).not.toBeNull();
	if (!canvas) return;

	for (let i = 0; i < 120; i++) {
		if (canvas.width > 0 && alphaAt(canvas, 0.5, 0.5) > 0) break;
		await waitForPaintedFraction(canvas, 1);
	}

	// The object's red, not the near-black fallback a dropped color would give.
	const px = rgbaAt(canvas, 0.5, 0.5);
	expect([px[0], px[1], px[2], (px[3] ?? 0) > 0]).toEqual([255, 0, 0, true]);
});
