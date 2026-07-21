import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Puddle from '../Puddle.svelte';
import { waitForPaintedFraction, wetAt } from './svg';

test('renders a thresholded puddle silhouette', async () => {
	await render(Puddle, {
		props: { animated: false, color: '#141414', style: 'width:760px;height:420px;' },
	});
	const path = document.querySelector<SVGPathElement>('path.shape');
	expect(path).not.toBeNull();
	if (!path) return;

	const fraction = await waitForPaintedFraction(path, 120);

	// A puddle covers a chunk of the box but leaves green around it.
	expect(fraction).toBeGreaterThan(0.1);
	expect(fraction).toBeLessThan(0.9);
	// Wet in the middle, dry in the corners => a rounded blob, not a filled rectangle.
	expect(wetAt(path, 0.5, 0.5)).toBe(true);
	expect(wetAt(path, 0.02, 0.03)).toBe(false);
	expect(wetAt(path, 0.98, 0.97)).toBe(false);
});

test('accepts a culori Color object for `color`', async () => {
	await render(Puddle, {
		props: {
			animated: false,
			color: { mode: 'rgb', r: 1, g: 0, b: 0 },
			style: 'width:760px;height:420px;',
		},
	});
	const host = document.querySelector<HTMLElement>('.host');
	const path = document.querySelector<SVGPathElement>('path.shape');
	expect(host).not.toBeNull();
	expect(path).not.toBeNull();
	if (!host || !path) return;

	await waitForPaintedFraction(path, 120);
	expect(host.style.getPropertyValue('--puddle-color')).toMatch(/^color\(srgb /);
	expect(getComputedStyle(path).fill).not.toBe('rgb(20, 20, 20)');
});

test('preserves wide-gamut CSS color variables for the SVG and fallback', async () => {
	await render(Puddle, {
		props: {
			animated: false,
			color: 'color(display-p3 1 0 0)',
			style: 'width:760px;height:420px;',
		},
	});

	const host = document.querySelector<HTMLElement>('.host');
	expect(host?.style.getPropertyValue('--puddle-color-wide')).toMatch(/^color\(display-p3 /);
	expect(host?.style.getPropertyValue('--puddle-color')).toMatch(/^color\(srgb /);
});

test('reuses the responsive SVG shape as an inherited normalized clip', async () => {
	await render(Puddle, {
		props: { animated: false, style: 'width:760px;height:420px;' },
	});
	const host = document.querySelector<HTMLElement>('.host');
	const svg = document.querySelector<SVGSVGElement>('svg.renderer');
	const path = svg?.querySelector<SVGPathElement>('path.shape');
	const clip = svg?.querySelector<SVGClipPathElement>('clipPath');
	const use = clip?.querySelector<SVGUseElement>('use');
	expect(host).not.toBeNull();
	expect(svg).not.toBeNull();
	expect(path).not.toBeNull();
	expect(clip).not.toBeNull();
	expect(use).not.toBeNull();
	if (!host || !svg || !path || !clip || !use) return;

	expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
	expect(clip.getAttribute('clipPathUnits')).toBe('objectBoundingBox');
	expect(use.getAttribute('href')).toBe(`#${path.id}`);
	expect(use.getAttribute('transform')).toBe(
		`scale(${(1 / svg.viewBox.baseVal.width).toString()} ${(1 / svg.viewBox.baseVal.height).toString()})`,
	);
	const clipValue = host.style.getPropertyValue('--puddle-clip');
	expect(clipValue).toContain(`#${clip.id}`);
	expect(getComputedStyle(path).getPropertyValue('--puddle-clip')).toContain(`#${clip.id}`);
});

test('uses unique clip and shape IDs for each component instance', async () => {
	await render(Puddle, { props: { animated: false, style: 'width:80px;height:60px;' } });
	await render(Puddle, { props: { animated: false, style: 'width:80px;height:60px;' } });

	const paths = [...document.querySelectorAll<SVGPathElement>('path.shape')];
	const clips = [...document.querySelectorAll<SVGClipPathElement>('clipPath')];
	expect(paths).toHaveLength(2);
	expect(clips).toHaveLength(2);
	expect(new Set(paths.map((path) => path.id)).size).toBe(2);
	expect(new Set(clips.map((clip) => clip.id)).size).toBe(2);
});
