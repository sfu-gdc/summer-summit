import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Puddle from '../Puddle.svelte';
import { nextFrame, paintedHalves } from './svg';

async function waitForPaintedHalves(
	path: SVGPathElement,
): Promise<{ left: number; right: number }> {
	let halves = { left: 0, right: 0 };
	for (let i = 0; i < 120; i++) {
		halves = paintedHalves(path);
		if (halves.left + halves.right > 0) break;
		await nextFrame();
	}
	return halves;
}

test('followCursor gently leans the puddle toward the pointer', async () => {
	await render(Puddle, {
		props: { animated: true, followCursor: true, style: 'width:760px;height:420px;' },
	});
	const path = document.querySelector<SVGPathElement>('path[data-puddle-shape]');
	expect(path).not.toBeNull();
	if (!path) return;

	const before = await waitForPaintedHalves(path);
	const total = before.left + before.right;
	expect(total).toBeGreaterThan(0);

	// Hold the cursor well to the right of the puddle and let the loop run.
	const rect = path.ownerSVGElement?.getBoundingClientRect();
	expect(rect).toBeDefined();
	if (!rect) return;
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
		await new Promise<void>((resolve) => void setTimeout(resolve, 500));
		after = paintedHalves(path);
	}
	expect(after.right - after.left).toBeGreaterThan(target);
});

test('deviceGravity sloshes the puddle using device rotation', async () => {
	await render(Puddle, {
		props: {
			animated: true,
			deviceGravity: true,
			deviceTilt: 8,
			deviceEase: 0.05,
			style: 'width:760px;height:420px;',
		},
	});
	const path = document.querySelector<SVGPathElement>('path[data-puddle-shape]');
	expect(path).not.toBeNull();
	if (!path) return;

	const before = await waitForPaintedHalves(path);
	const total = before.left + before.right;
	expect(total).toBeGreaterThan(0);

	window.dispatchEvent(
		new DeviceMotionEvent('devicemotion', {
			rotationRate: { alpha: 0, beta: 0, gamma: 0 },
			interval: 16,
		}),
	);
	await new Promise<void>((resolve) => void setTimeout(resolve, 50));

	const target = before.right - before.left + total * 0.02;
	let after = before;
	for (let i = 0; i < 30 && after.right - after.left <= target; i++) {
		window.dispatchEvent(
			new DeviceMotionEvent('devicemotion', {
				rotationRate: { alpha: 0, beta: 360, gamma: 0 },
				interval: 16,
			}),
		);
		await new Promise<void>((resolve) => void setTimeout(resolve, 100));
		after = paintedHalves(path);
	}
	expect(after.right - after.left).toBeGreaterThan(target);
});
