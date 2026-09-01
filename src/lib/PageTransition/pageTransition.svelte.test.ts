import { expect, test } from 'vitest';

import { PageTransitionCoordinator } from './pageTransition.svelte';

test('only lets the active navigation transaction settle the transition', () => {
	const coordinator = new PageTransitionCoordinator();
	const firstTransition = coordinator.prepareReveal();
	const secondTransition = coordinator.prepareReveal();

	coordinator.finishOnDarkPage(firstTransition);

	expect(coordinator.phase).toBe('covered');
	expect(coordinator.overlayVisible).toBe(true);

	coordinator.finishOnDarkPage(secondTransition);

	expect(coordinator.phase).toBe('idle');
	expect(coordinator.overlayVisible).toBe(false);
});

test('finishes a reveal when the fresh Home target never registers', async () => {
	const coordinator = new PageTransitionCoordinator();
	const transition = coordinator.prepareReveal();

	await coordinator.revealHome(transition);

	expect(coordinator.phase).toBe('idle');
	expect(coordinator.overlayVisible).toBe(false);
});
