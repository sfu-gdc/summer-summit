<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { expect, within } from 'storybook/test';

	import LandingHero from './LandingHero.svelte';
	import {
		LANDING_HERO_EVENT_ARGS,
		LANDING_HERO_STORY_CASES,
		LANDING_HERO_VIEWPORTS,
	} from './storyConfig';

	const { Story } = defineMeta({
		title: 'Landing Hero',
		component: LandingHero,
		args: LANDING_HERO_EVENT_ARGS,
		parameters: {
			layout: 'fullscreen',
			viewport: { options: LANDING_HERO_VIEWPORTS },
		},
	});

	async function settleLayout(document: Document) {
		await document.fonts.ready;
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					resolve();
				});
			});
		});
	}

	async function settlePuddleLive(puddle: HTMLElement) {
		for (let frame = 0; frame < 120 && !puddle.hasAttribute('data-puddle-live'); frame++) {
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => {
					resolve();
				});
			});
		}
	}

	async function expectNoHorizontalOverflow(canvasElement: HTMLElement) {
		const document = canvasElement.ownerDocument;

		await settleLayout(document);

		const { body, documentElement } = document;

		await expect(documentElement.scrollWidth).toBeLessThanOrEqual(documentElement.clientWidth);
		await expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
	}

	function bounds(element: Element) {
		const { left, top, width, height } = element.getBoundingClientRect();
		return { left, top, width, height };
	}

	async function expectMatchingBounds(first: Element, second: Element) {
		const firstBounds = bounds(first);
		const secondBounds = bounds(second);

		await expect(secondBounds.left).toBeCloseTo(firstBounds.left);
		await expect(secondBounds.top).toBeCloseTo(firstBounds.top);
		await expect(secondBounds.width).toBeCloseTo(firstBounds.width);
		await expect(secondBounds.height).toBeCloseTo(firstBounds.height);
	}

	async function expectAccessibleLayers(canvasElement: HTMLElement) {
		await settleLayout(canvasElement.ownerDocument);

		const hero = canvasElement.querySelector<HTMLElement>('[data-landing-hero]');
		const puddle = canvasElement.querySelector<HTMLElement>('[data-puddle-host]');
		if (puddle) await settlePuddleLive(puddle);
		const baseLayer = canvasElement.querySelector<HTMLElement>('[data-landing-layer="base"]');
		const inverseLayers = canvasElement.querySelectorAll<HTMLElement>(
			'[data-landing-layer="inverse"]',
		);
		const foreignObject = canvasElement.querySelector<SVGForeignObjectElement>(
			'[data-puddle-clipped-foreign-object]',
		);
		const liveInverseLayer = foreignObject?.querySelector<HTMLElement>(
			'[data-landing-layer="inverse"]',
		);
		const staticInverseLayer = canvasElement.querySelector<HTMLElement>(
			'[data-puddle-static-clipped-content] [data-landing-layer="inverse"]',
		);
		const inverseLayer = puddle?.hasAttribute('data-puddle-live')
			? liveInverseLayer
			: staticInverseLayer;
		const visibleUse = canvasElement.querySelector<SVGUseElement>('[data-puddle-visible-shape]');
		const clipUse = canvasElement.querySelector<SVGUseElement>('[data-puddle-clip-shape]');
		const content = canvasElement.querySelectorAll<HTMLElement>('[data-landing-content]');

		await expect(hero).not.toBeNull();
		await expect(puddle).not.toBeNull();
		await expect(baseLayer).not.toBeNull();
		await expect(foreignObject).not.toBeNull();
		await expect(liveInverseLayer).not.toBeNull();
		await expect(staticInverseLayer).not.toBeNull();
		await expect(inverseLayer).not.toBeNull();
		await expect(inverseLayers).toHaveLength(2);
		await expect(content).toHaveLength(1 + inverseLayers.length);
		if (
			!hero ||
			!puddle ||
			!baseLayer ||
			!foreignObject ||
			!inverseLayer ||
			!visibleUse ||
			!clipUse
		)
			return;

		await expect(baseLayer.querySelectorAll('[data-landing-content="base"]')).toHaveLength(1);
		await expect(inverseLayer.querySelectorAll('[data-landing-content="inverse"]')).toHaveLength(1);
		await expect(baseLayer).not.toHaveAttribute('aria-hidden');
		await expect(baseLayer).not.toHaveAttribute('inert');
		for (const layer of inverseLayers) {
			await expect(layer).toHaveAttribute('aria-hidden', 'true');
			await expect(layer).toHaveAttribute('inert');
		}
		const puddleClip = getComputedStyle(puddle).getPropertyValue('--puddle-clip').trim();
		await expect(puddleClip).toMatch(/^shape\(/);
		await expect(CSS.supports('clip-path', puddleClip)).toBe(true);
		await expect(foreignObject.getAttribute('clip-path')).toMatch(/^url\("#.+-puddle-clip"\)$/);
		await expect(clipUse.style.transform).toBe(visibleUse.style.transform);
		await expect(clipUse.style.transformBox).toBe(visibleUse.style.transformBox);

		await expectMatchingBounds(baseLayer, inverseLayer);
		await expectMatchingBounds(hero, puddle);
	}

	async function expectPuddleProfile(
		canvasElement: HTMLElement,
		expectedProfile: 'compact' | 'medium' | 'expanded' | 'large',
	) {
		const puddle = canvasElement.querySelector<HTMLElement>('[data-puddle-host]');

		await expect(puddle).toHaveAttribute('data-puddle-profile', expectedProfile);
	}

	async function expectLandingSemantics(canvasElement: HTMLElement) {
		const canvas = within(canvasElement);
		const hiddenTitles = canvasElement.querySelectorAll<HTMLElement>('[data-landing-title]');

		await expect(canvasElement.querySelectorAll('h1')).toHaveLength(1);
		await expect(
			canvas.getByRole('heading', {
				level: 1,
				name: 'SEPTEMBER 4–6 SUMMER SUMMIT GAME JAM 2026',
			}),
		).toBeInTheDocument();
		await expect(canvas.queryByRole('navigation')).toBeNull();
		await expect(canvas.queryByRole('button', { name: /about|schedule|faq/i })).toBeNull();
		await expect(canvas.queryByRole('link', { name: /about|schedule|faq/i })).toBeNull();
		await expect(hiddenTitles).toHaveLength(
			1 + canvasElement.querySelectorAll('[data-landing-layer="inverse"]').length,
		);
		await expect(
			Array.from(hiddenTitles).every((title) => title.closest('[aria-hidden="true"]') !== null),
		).toBe(true);

		for (const copy of ['GAME DEV CLUB X IATSU 2026', 'SFU BURNABY CAMPUS']) {
			const matches = canvas.getAllByText(copy, { exact: true });
			const hiddenMatches = matches.filter(
				(match) => match.closest('[aria-hidden="true"]') !== null,
			);

			await expect(matches.filter((match) => !hiddenMatches.includes(match))).toHaveLength(1);
			await expect(hiddenMatches).toHaveLength(matches.length - 1);
		}
	}

	async function expectDestinationCta(canvasElement: HTMLElement) {
		const canvas = within(canvasElement);
		const discord = canvas.getByRole('link', { name: 'Join the Discord' });
		const tickets = canvas.getByRole('link', { name: 'Get your ticket' });
		const puddle = canvasElement.querySelector<HTMLElement>('[data-puddle-host]');
		if (puddle) await settlePuddleLive(puddle);
		const baseVisuals = canvasElement.querySelectorAll<HTMLElement>(
			'[data-clip-aware-visual="base"] [data-button-surface]',
		);
		const inverseVisuals = canvasElement.querySelectorAll<HTMLElement>(
			'[data-puddle-clipped-foreign-object] [data-clip-aware-visual="inverse"] [data-button-surface]',
		);

		await expect(
			canvas.queryByRole('button', { name: /join the discord|get your ticket/i }),
		).toBeNull();
		await expect(discord).toHaveAttribute('href', 'https://discord.gg/jmZ8jmWHBx');
		await expect(tickets).toHaveAttribute(
			'href',
			'https://www.eventbrite.ca/e/summer-summit-game-jam-2026-tickets-1994789136004',
		);
		await expect(baseVisuals).toHaveLength(2);
		await expect(inverseVisuals).toHaveLength(2);
		await expect(discord.closest('[data-landing-layer]')).toHaveAttribute(
			'data-landing-layer',
			'base',
		);
		await expect(tickets.closest('[data-landing-layer]')).toHaveAttribute(
			'data-landing-layer',
			'base',
		);

		for (const [index, control] of [discord, tickets].entries()) {
			const baseVisual = baseVisuals[index];
			const inverseVisual = inverseVisuals[index];
			if (!baseVisual || !inverseVisual) return;

			await expectMatchingBounds(baseVisual, inverseVisual);
			await expectMatchingBounds(baseVisual, control);
		}
	}

	async function expectNoCta(canvasElement: HTMLElement) {
		const canvas = within(canvasElement);

		await expect(canvas.queryByText('Join the Discord', { exact: true })).toBeNull();
		await expect(canvas.queryByText('Get your ticket', { exact: true })).toBeNull();
		await expect(canvas.queryByRole('button')).toBeNull();
		await expect(
			canvas.queryByRole('link', { name: /join the discord|get your ticket/i }),
		).toBeNull();
	}
</script>

<Story
	name="Compact Portrait"
	args={LANDING_HERO_STORY_CASES.compact.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.compact.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectAccessibleLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleProfile(canvasElement, 'compact');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Medium"
	args={LANDING_HERO_STORY_CASES.medium.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.medium.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectAccessibleLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleProfile(canvasElement, 'medium');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Expanded"
	args={LANDING_HERO_STORY_CASES.expanded.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.expanded.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectAccessibleLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleProfile(canvasElement, 'expanded');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Large Desktop"
	args={LANDING_HERO_STORY_CASES.large.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.large.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectAccessibleLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleProfile(canvasElement, 'large');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Secondary Accent"
	args={{ ...LANDING_HERO_STORY_CASES.expanded.args, class: 'secondary-accent-preview' }}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.expanded.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectDestinationCta(canvasElement);
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Without CTA"
	args={LANDING_HERO_STORY_CASES.withoutCta.args}
	globals={{
		viewport: { value: LANDING_HERO_STORY_CASES.withoutCta.viewport, isRotated: false },
	}}
	play={async ({ canvasElement }) => {
		await expectAccessibleLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectNoCta(canvasElement);
		await expectPuddleProfile(canvasElement, 'expanded');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Reduced Motion"
	args={LANDING_HERO_STORY_CASES.reducedMotion.args}
	globals={{
		viewport: { value: LANDING_HERO_STORY_CASES.reducedMotion.viewport, isRotated: false },
	}}
	parameters={{ chromatic: { prefersReducedMotion: 'reduce' } }}
	play={async ({ canvasElement }) => {
		await expectAccessibleLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleProfile(canvasElement, 'expanded');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<style>
	:global(.secondary-accent-preview [data-puddle-static-clipped-content]),
	:global(.secondary-accent-preview [data-puddle-overlay-renderer]) {
		visibility: hidden !important;
	}
</style>
