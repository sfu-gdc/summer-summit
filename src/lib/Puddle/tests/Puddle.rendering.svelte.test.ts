import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import Puddle from '../Puddle.svelte';
import PuddleClipFixture from './PuddleClipFixture.svelte';
import { waitForPaintedFraction, wetAt } from './svg';

async function screenshotPixels(base64: string) {
	const image = new Image();
	image.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
	await image.decode();
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const context = canvas.getContext('2d');
	expect(context).not.toBeNull();
	context?.drawImage(image, 0, 0);
	return {
		at(x: number, y: number) {
			return context?.getImageData(
				Math.round(x * (canvas.width - 1)),
				Math.round(y * (canvas.height - 1)),
				1,
				1,
			).data;
		},
	};
}

test('renders a thresholded puddle silhouette', async () => {
	await render(Puddle, {
		props: {
			animated: false,
			bowlWidth: 517,
			bowlHeight: 252,
			color: '#141414',
			style: 'width:760px;height:420px;',
		},
	});
	const path = document.querySelector<SVGPathElement>('path[data-puddle-shape]');
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
	const host = document.querySelector<HTMLElement>('[data-puddle-host]');
	const path = document.querySelector<SVGPathElement>('path[data-puddle-shape]');
	expect(host).not.toBeNull();
	expect(path).not.toBeNull();
	if (!host || !path) return;

	await waitForPaintedFraction(path, 120);
	expect(host.style.getPropertyValue('--puddle-color')).toMatch(/^color\(srgb /);
	expect(getComputedStyle(path).fill).not.toBe('rgb(20, 20, 20)');
});

test('uses one canonical CSS color variable for the SVG and fallback', async () => {
	await render(Puddle, {
		props: {
			animated: false,
			color: 'color(display-p3 1 0 0)',
			style: 'width:760px;height:420px;',
		},
	});

	const host = document.querySelector<HTMLElement>('[data-puddle-host]');
	expect(host?.style.getPropertyValue('--puddle-color')).toBe('color(display-p3 1 0 0)');
});

test('clips inverse content with the same local SVG path and transform as the fill', async () => {
	await render(PuddleClipFixture);
	const host = document.querySelector<HTMLElement>('[data-puddle-host]');
	const fillSvg = document.querySelector<SVGSVGElement>('svg[data-puddle-renderer]');
	const overlaySvg = document.querySelector<SVGSVGElement>('svg[data-puddle-overlay-renderer]');
	const path = fillSvg?.querySelector<SVGPathElement>('path[data-puddle-shape]');
	const overlayPath = overlaySvg?.querySelector<SVGPathElement>('[data-puddle-overlay-shape]');
	const visibleUse = fillSvg?.querySelector<SVGUseElement>('[data-puddle-visible-shape]');
	const clipUse = overlaySvg?.querySelector<SVGUseElement>('[data-puddle-clip-shape]');
	const foreignObject = overlaySvg?.querySelector<SVGForeignObjectElement>(
		'[data-puddle-clipped-foreign-object]',
	);
	const baseProbe = host?.querySelector<HTMLElement>('[data-puddle-base-probe]');
	const probe = foreignObject?.querySelector<HTMLElement>('[data-puddle-clipped-probe]');
	expect(host).not.toBeNull();
	expect(fillSvg).not.toBeNull();
	expect(overlaySvg).not.toBeNull();
	expect(path).not.toBeNull();
	expect(overlayPath).not.toBeNull();
	expect(visibleUse).not.toBeNull();
	expect(clipUse).not.toBeNull();
	expect(foreignObject).not.toBeNull();
	expect(baseProbe).not.toBeNull();
	expect(probe).not.toBeNull();
	if (
		!host ||
		!fillSvg ||
		!overlaySvg ||
		!path ||
		!overlayPath ||
		!visibleUse ||
		!clipUse ||
		!foreignObject ||
		!baseProbe ||
		!probe
	)
		return;

	expect(visibleUse.style.transform).toContain('translate(50%, 50%)');
	expect(path.getAttribute('d')).toBe(overlayPath.getAttribute('d'));
	expect(clipUse.getAttribute('href')).toBe(`#${overlayPath.id}`);
	expect(clipUse.style.transform).toBe(visibleUse.style.transform);
	expect(clipUse.style.transformBox).toBe(visibleUse.style.transformBox);
	expect(foreignObject.getAttribute('clip-path')).toContain('puddle-clip');
	const cellSize = Number(fillSvg.dataset['puddleCellSize']);
	expect(path.getAttribute('d')).toMatch(new RegExp(`v${cellSize.toString()}h-`));

	baseProbe.style.cssText =
		'position:absolute;inset:0;width:100%;height:100%;background:rgb(0,0,255);';
	overlaySvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
	foreignObject.firstElementChild?.setAttribute('style', 'width:100%;height:100%;');
	probe.style.cssText = 'width:100%;height:100%;background:rgb(255,0,0);';
	const screenshot = await page.getByTestId('puddle-clip-fixture').screenshot({ save: false });
	const pixels = await screenshotPixels(screenshot);
	expect(Array.from(pixels.at(0.5, 0.5) ?? [])).toEqual([255, 0, 0, 255]);
	expect(Array.from(pixels.at(0.01, 0.01) ?? [])).toEqual([0, 0, 255, 255]);
});

test('keeps the apparent cell size stable when the measured grid changes', async () => {
	await render(Puddle, {
		props: { animated: false, cellSize: 19, style: 'width:380px;height:228px;' },
	});
	const host = document.querySelector<HTMLElement>('[data-puddle-host]');
	const svg = document.querySelector<SVGSVGElement>('svg[data-puddle-renderer]');
	const path = svg?.querySelector<SVGPathElement>('path[data-puddle-shape]');
	expect(host).not.toBeNull();
	expect(svg).not.toBeNull();
	expect(path).not.toBeNull();
	if (!host || !svg || !path) return;

	await expect.poll(() => host.hasAttribute('data-puddle-live'), { timeout: 10_000 }).toBe(true);
	const beforeRows = Number(svg.dataset['puddleRows']);
	const beforeTransform = svg.querySelector<SVGUseElement>('[data-puddle-visible-shape]')?.style
		.transform;
	host.style.setProperty('height', '456px');

	await expect
		.poll(() => Number(svg.dataset['puddleRows']), { timeout: 10_000 })
		.toBeGreaterThan(beforeRows);
	expect(Number(svg.dataset['puddleCellSize'])).toBe(19);
	expect(path.getAttribute('d')).toMatch(/v19h-/);
	expect(svg.querySelector<SVGUseElement>('[data-puddle-visible-shape]')?.style.transform).not.toBe(
		beforeTransform,
	);
}, 20_000);

test('clips every responsive snapshot in centered CSS-pixel space', async () => {
	await render(Puddle, {
		props: {
			animated: false,
			responsiveSnapshots: true,
			style: 'width:400px;height:800px;',
		},
	});
	const host = document.querySelector<HTMLElement>('[data-puddle-host]');
	expect(host).not.toBeNull();
	if (!host) return;
	host.style.position = 'fixed';
	host.style.inset = '0 auto auto 0';
	const overlay = document.createElement('div');
	overlay.style.cssText =
		'position:absolute;inset:0;z-index:1000;pointer-events:auto;background:red;';
	host.append(overlay);
	const rect = host.getBoundingClientRect();

	for (const name of ['compact', 'medium', 'expanded', 'large']) {
		const svg = host.querySelector<SVGSVGElement>(`[data-puddle-static-profile="${name}"]`);
		const visibleUse = svg?.querySelector<SVGUseElement>('[data-puddle-static-visible]');
		expect(svg).not.toBeNull();
		expect(visibleUse).not.toBeNull();
		if (!svg || !visibleUse) continue;

		expect(visibleUse.style.transform).toContain('translate(50%, 50%)');
		const clipValue = host.style.getPropertyValue(`--puddle-clip-${name}`);
		expect(clipValue).toMatch(/^shape\(/);
		expect(CSS.supports('clip-path', clipValue)).toBe(true);
		overlay.style.clipPath = clipValue;
		expect(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(
			overlay,
		);
		expect(document.elementFromPoint(rect.left + 2, rect.top + 2)).not.toBe(overlay);
	}
});

test('uses unique shape IDs for each component instance', async () => {
	await render(Puddle, { props: { animated: false, style: 'width:80px;height:60px;' } });
	await render(Puddle, { props: { animated: false, style: 'width:80px;height:60px;' } });

	const paths = [...document.querySelectorAll<SVGPathElement>('path[data-puddle-shape]')];
	expect(paths).toHaveLength(2);
	expect(new Set(paths.map((path) => path.id)).size).toBe(2);
});
