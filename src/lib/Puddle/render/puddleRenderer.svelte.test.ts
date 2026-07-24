import { expect, test, vi } from 'vitest';

import { createPuddleRenderer, puddlePath } from './puddleRenderer';

test('compacts adjacent wet cells into horizontal rectangular runs', () => {
	expect(puddlePath([1, 1, 0, 1, 0, 0, 1, 1, 1, 0], 5, 2)).toBe(
		'M0 0h2v1h-2zM3 0h1v1h-1zM1 1h3v1h-3z',
	);
});

test('only updates the path when the binary mask or target changes', () => {
	const renderer = createPuddleRenderer();
	const target = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	const setAttribute = vi.spyOn(target, 'setAttribute');

	expect(renderer.render(target, { nx: 3, ny: 1, height: [0.2, 0, 0.8], threshold: 0.1 })).toBe(
		true,
	);
	expect(target.getAttribute('d')).toBe('M0 0h1v1h-1zM2 0h1v1h-1z');
	expect(setAttribute).toHaveBeenCalledTimes(1);

	// Height changes that do not cross the threshold keep the same path.
	renderer.render(target, { nx: 3, ny: 1, height: [0.4, 0.05, 1], threshold: 0.1 });
	expect(setAttribute).toHaveBeenCalledTimes(1);

	renderer.render(target, { nx: 3, ny: 1, height: [0.4, 0.2, 1], threshold: 0.1 });
	expect(target.getAttribute('d')).toBe('M0 0h3v1h-3z');
	expect(setAttribute).toHaveBeenCalledTimes(2);

	const replacement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	renderer.render(replacement, { nx: 3, ny: 1, height: [0.4, 0.2, 1], threshold: 0.1 });
	expect(replacement.getAttribute('d')).toBe('M0 0h3v1h-3z');
});

test('rebuilds the path when grid dimensions change', () => {
	const renderer = createPuddleRenderer();
	const target = document.createElementNS('http://www.w3.org/2000/svg', 'path');

	renderer.render(target, { nx: 2, ny: 1, height: [1, 1], threshold: 0 });
	expect(target.getAttribute('d')).toBe('M0 0h2v1h-2z');

	renderer.render(target, { nx: 1, ny: 2, height: [1, 1], threshold: 0 });
	expect(target.getAttribute('d')).toBe('M0 0h1v1h-1zM0 1h1v1h-1z');
});
