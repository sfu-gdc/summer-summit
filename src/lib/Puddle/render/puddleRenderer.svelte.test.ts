import { rgb, toGamut } from 'culori';
import { expect, test } from 'vitest';

import { colorBytes, createPuddleRenderer } from './puddleRenderer';

const p3Red = { mode: 'p3', r: 1, g: 0, b: 0 } as const;

test('keeps Display-P3 channels when rendering into a supported P3 canvas', () => {
	expect(colorBytes(p3Red, 'display-p3')).toEqual([255, 0, 0, 255]);

	const canvas = document.createElement('canvas');
	const rendered = createPuddleRenderer().render(canvas, {
		nx: 1,
		ny: 1,
		height: [1],
		cssW: 1,
		cssH: 1,
		dpr: 1,
		threshold: 0,
		color: 'color(display-p3 1 0 0)',
	});

	expect(rendered).toBe(true);
	const context = canvas.getContext('2d');
	expect(context).not.toBeNull();
	if (!context) return;

	const actualSpace =
		context.getContextAttributes().colorSpace === 'display-p3' ? 'display-p3' : 'srgb';
	const pixel = context.getImageData(0, 0, 1, 1, { colorSpace: actualSpace });
	if (actualSpace === 'display-p3') {
		expect(pixel.colorSpace).toBe('display-p3');
		expect([...pixel.data]).toEqual([255, 0, 0, 255]);
	} else {
		const expected = colorBytes(p3Red, 'srgb');
		expect(expected).not.toBeNull();
		if (expected === null) return;
		expect([...pixel.data]).toEqual([...expected]);
	}
});

test('perceptually gamut-maps a P3 object for the sRGB fallback', () => {
	const mapped = rgb(toGamut('rgb', 'oklch')(p3Red));

	const bytes = colorBytes(p3Red, 'srgb');
	expect(bytes).toEqual([
		Math.round(mapped.r * 255),
		Math.round(mapped.g * 255),
		Math.round(mapped.b * 255),
		255,
	]);
	// P3 red's out-of-range green and blue channels must not be silently byte-clipped to zero.
	expect(bytes?.[1]).toBeGreaterThan(0);
	expect(bytes?.[2]).toBeGreaterThan(0);
});

test('uses the forced sRGB fallback pipeline when requested', () => {
	const canvas = document.createElement('canvas');
	const rendered = createPuddleRenderer({ colorSpace: 'srgb' }).render(canvas, {
		nx: 1,
		ny: 1,
		height: [1],
		cssW: 1,
		cssH: 1,
		dpr: 1,
		threshold: 0,
		color: p3Red,
	});

	expect(rendered).toBe(true);
	const context = canvas.getContext('2d');
	expect(context?.getContextAttributes().colorSpace).toBe('srgb');
	const expected = colorBytes(p3Red, 'srgb');
	expect(expected).not.toBeNull();
	if (expected === null) return;
	expect([...(context?.getImageData(0, 0, 1, 1).data ?? [])]).toEqual([...expected]);
});
