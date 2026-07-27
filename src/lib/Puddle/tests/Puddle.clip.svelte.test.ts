import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import PuddleClipFixture from './PuddleClipFixture.svelte';

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

test('clips inverse content with the same local SVG path and transform as the fill', async () => {
	await render(PuddleClipFixture);
	const host = document.querySelector<HTMLElement>('[data-puddle-host]');
	const fillSvg = document.querySelector<SVGSVGElement>('svg[data-puddle-renderer]');
	const path = fillSvg?.querySelector<SVGPathElement>('path[data-puddle-shape]');
	const visibleUse = fillSvg?.querySelector<SVGUseElement>('[data-puddle-visible-shape]');
	const clipPath = fillSvg?.querySelector<SVGPathElement>('[data-puddle-clip-shape]');
	const clippedContent = host?.querySelector<HTMLElement>(':scope > [data-puddle-clipped-content]');
	const baseProbe = host?.querySelector<HTMLElement>('[data-puddle-base-probe]');
	const probe = clippedContent?.querySelector<HTMLElement>('[data-puddle-clipped-probe]');
	expect(host).not.toBeNull();
	expect(fillSvg).not.toBeNull();
	expect(path).not.toBeNull();
	expect(visibleUse).not.toBeNull();
	expect(clipPath).not.toBeNull();
	expect(clippedContent).not.toBeNull();
	expect(host?.querySelector('foreignObject')).toBeNull();
	expect(baseProbe).not.toBeNull();
	expect(probe).not.toBeNull();
	if (
		!host ||
		!fillSvg ||
		!path ||
		!visibleUse ||
		!clipPath ||
		!clippedContent ||
		!baseProbe ||
		!probe
	)
		return;

	await expect.poll(() => host.hasAttribute('data-puddle-live'), { timeout: 10_000 }).toBe(true);
	expect(visibleUse.style.transform).toContain('translate(50%, 50%)');
	expect(clipPath.getAttribute('d')).toBe(path.getAttribute('d'));
	expect(clipPath.parentElement?.getAttribute('clipPathUnits')).toBe('userSpaceOnUse');
	expect(clipPath.getAttribute('transform')).toMatch(/^translate\(/);
	expect(clippedContent.style.clipPath).toBe('var(--puddle-clip)');
	expect(host.style.getPropertyValue('--puddle-clip')).toContain('puddle-clip');
	const cellSize = Number(fillSvg.dataset['puddleCellSize']);
	expect(path.getAttribute('d')).toMatch(new RegExp(`v${cellSize.toString()}h-`));

	baseProbe.style.cssText =
		'position:absolute;inset:0;width:100%;height:100%;background:rgb(0,0,255);';
	clippedContent.style.cssText =
		'position:absolute;inset:0;width:100%;height:100%;clip-path:var(--puddle-clip);';
	probe.style.cssText = 'width:100%;height:100%;background:rgb(255,0,0);';
	const screenshot = await page.getByTestId('puddle-clip-fixture').screenshot({ save: false });
	const pixels = await screenshotPixels(screenshot);
	expect(Array.from(pixels.at(0.5, 0.5) ?? [])).toEqual([255, 0, 0, 255]);
	expect(Array.from(pixels.at(0.01, 0.01) ?? [])).toEqual([0, 0, 255, 255]);
});
