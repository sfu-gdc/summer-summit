import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Puddle from './Puddle.svelte';

const nextFrame = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});

function ctxOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('no 2d context');
	return ctx;
}

function rgbaAt(canvas: HTMLCanvasElement, fx: number, fy: number): Uint8ClampedArray {
	const x = Math.floor(canvas.width * fx);
	const y = Math.floor(canvas.height * fy);
	return ctxOf(canvas).getImageData(x, y, 1, 1).data;
}

function alphaAt(canvas: HTMLCanvasElement, fx: number, fy: number): number {
	return rgbaAt(canvas, fx, fy)[3] ?? 0;
}

function paintedFraction(canvas: HTMLCanvasElement): number {
	const { data } = ctxOf(canvas).getImageData(0, 0, canvas.width, canvas.height);
	let n = 0;
	for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) n++;
	return n / (canvas.width * canvas.height);
}

function paintedHalves(canvas: HTMLCanvasElement): { left: number; right: number } {
	const { data } = ctxOf(canvas).getImageData(0, 0, canvas.width, canvas.height);
	let left = 0;
	let right = 0;
	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			if ((data[(y * canvas.width + x) * 4 + 3] ?? 0) > 0) {
				if (x < canvas.width / 2) left++;
				else right++;
			}
		}
	}
	return { left, right };
}

test('renders a thresholded puddle silhouette', async () => {
	await render(Puddle, {
		props: { animated: false, color: '#141414', style: 'width:760px;height:420px;' },
	});
	const canvas = document.querySelector('canvas');
	expect(canvas).not.toBeNull();
	if (!canvas) return;

	let frac = 0;
	for (let i = 0; i < 120; i++) {
		if (canvas.width > 0) {
			frac = paintedFraction(canvas);
			if (frac > 0) break;
		}
		await nextFrame();
	}

	// A puddle covers a chunk of the box but leaves green around it.
	expect(frac).toBeGreaterThan(0.1);
	expect(frac).toBeLessThan(0.9);
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
		await nextFrame();
	}

	// The object's red, not the near-black fallback a dropped color would give.
	const px = rgbaAt(canvas, 0.5, 0.5);
	expect([px[0], px[1], px[2], (px[3] ?? 0) > 0]).toEqual([255, 0, 0, true]);
});

test('followCursor gently leans the puddle toward the pointer', async () => {
	await render(Puddle, {
		props: { animated: true, followCursor: true, style: 'width:760px;height:420px;' },
	});
	const canvas = document.querySelector('canvas');
	expect(canvas).not.toBeNull();
	if (!canvas) return;

	let before = { left: 0, right: 0 };
	for (let i = 0; i < 120; i++) {
		if (canvas.width > 0) {
			before = paintedHalves(canvas);
			if (before.left + before.right > 0) break;
		}
		await nextFrame();
	}
	const total = before.left + before.right;
	expect(total).toBeGreaterThan(0);

	// Hold the cursor well to the right of the puddle and let the loop run.
	const rect = canvas.getBoundingClientRect();
	window.dispatchEvent(
		new PointerEvent('pointermove', {
			clientX: Math.min(window.innerWidth - 2, rect.right + 300),
			clientY: rect.top + rect.height / 2,
		}),
	);
	// Poll for the migration instead of a fixed wait: under full-suite load RAF
	// starves and the lean accumulates slower. 2% of the painted area is ~10 grid
	// cells of systematic shift — far beyond raindrop jitter (~1 cell of wobble).
	const target = before.right - before.left + total * 0.02;
	let after = before;
	for (let i = 0; i < 30 && after.right - after.left <= target; i++) {
		await new Promise<void>((r) => void setTimeout(r, 500));
		after = paintedHalves(canvas);
	}
	expect(after.right - after.left).toBeGreaterThan(target);
});

test('deviceGravity leans the puddle using motion-sensor gravity', async () => {
	await render(Puddle, {
		props: {
			animated: true,
			deviceGravity: true,
			deviceTilt: 8,
			deviceEase: 0.05,
			deviceNeutralWindow: 10,
			style: 'width:760px;height:420px;',
		},
	});
	const canvas = document.querySelector('canvas');
	expect(canvas).not.toBeNull();
	if (!canvas) return;

	let before = { left: 0, right: 0 };
	for (let i = 0; i < 120; i++) {
		if (canvas.width > 0) {
			before = paintedHalves(canvas);
			if (before.left + before.right > 0) break;
		}
		await nextFrame();
	}
	const total = before.left + before.right;
	expect(total).toBeGreaterThan(0);

	window.dispatchEvent(
		new DeviceMotionEvent('devicemotion', {
			accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 },
			interval: 16,
		}),
	);
	await new Promise<void>((resolve) => void setTimeout(resolve, 100));

	const target = before.right - before.left + total * 0.02;
	let after = before;
	for (let i = 0; i < 30 && after.right - after.left <= target; i++) {
		window.dispatchEvent(
			new DeviceMotionEvent('devicemotion', {
				accelerationIncludingGravity: { x: -9.8, y: 0, z: 0 },
				interval: 16,
			}),
		);
		await new Promise<void>((resolve) => void setTimeout(resolve, 100));
		after = paintedHalves(canvas);
	}
	expect(after.right - after.left).toBeGreaterThan(target);
});
