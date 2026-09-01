import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { PageTransitionCoordinator } from '../PageTransition/pageTransition.svelte';
import SiteChrome from './SiteChrome.svelte';

import 'virtual:uno.css';

function bounds(element: Element) {
	const { left, top, width, height } = element.getBoundingClientRect();
	return { left, top, width, height };
}

test('keeps one semantic chrome surface aligned with an inert copy clipped by the flood mask', async () => {
	const coordinator = new PageTransitionCoordinator();
	coordinator.overlayPath = 'M0 0h28v28h-28z';
	coordinator.overlayClipTransform = 'translate(28 56)';

	await render(SiteChrome, { props: { coordinator, routeId: '/' } });

	const semantic = document.querySelector<HTMLElement>('[data-site-chrome-layer="semantic"]');
	const inverse = document.querySelector<HTMLElement>('[data-site-chrome-inverse]');
	const inverseSurface = inverse?.querySelector<HTMLElement>('[data-site-chrome-layer="inverse"]');
	const clipPath = document.querySelector<SVGClipPathElement>('[data-site-chrome-mask] clipPath');
	const maskPath = clipPath?.querySelector('path');

	expect(semantic).not.toBeNull();
	expect(inverse).not.toBeNull();
	expect(inverseSurface).not.toBeNull();
	expect(clipPath).not.toBeNull();
	expect(maskPath).not.toBeNull();
	if (!semantic || !inverse || !inverseSurface || !clipPath || !maskPath) return;

	expect(document.querySelectorAll('[data-site-chrome-layer="semantic"]')).toHaveLength(1);
	expect(semantic.querySelectorAll('nav a')).toHaveLength(2);
	expect(inverseSurface.querySelectorAll('nav a')).toHaveLength(2);
	expect(inverse).toHaveAttribute('aria-hidden', 'true');
	expect(inverse).toHaveAttribute('inert');
	expect(clipPath.getAttribute('clipPathUnits')).toBe('userSpaceOnUse');
	expect(maskPath.getAttribute('d')).toBe(coordinator.overlayPath);
	expect(maskPath.getAttribute('transform')).toBe(coordinator.overlayClipTransform);
	expect(inverse.style.clipPath).toContain('site-chrome-clip');
	expect(bounds(inverseSurface)).toEqual(bounds(semantic));

	coordinator.overlayPath = 'M0 0h56v28h-56z';
	await expect.poll(() => maskPath.getAttribute('d')).toBe(coordinator.overlayPath);
});
