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

	async function expectLandingLayers(canvasElement: HTMLElement) {
		await settleLayout(canvasElement.ownerDocument);

		const hero = canvasElement.querySelector<HTMLElement>('[data-landing-hero]');
		const puddle = canvasElement.querySelector<HTMLElement>('[data-puddle-host]');
		const clip = puddle?.querySelector<SVGClipPathElement>('clipPath');
		const baseLayer = canvasElement.querySelector<HTMLElement>('[data-landing-layer="base"]');
		const inverseLayer = canvasElement.querySelector<HTMLElement>('[data-landing-layer="inverse"]');
		const content = canvasElement.querySelectorAll<HTMLElement>('[data-landing-content]');

		await expect(hero).not.toBeNull();
		await expect(puddle).not.toBeNull();
		await expect(clip).not.toBeNull();
		await expect(baseLayer).not.toBeNull();
		await expect(inverseLayer).not.toBeNull();
		await expect(content).toHaveLength(2);
		if (!hero || !puddle || !clip || !baseLayer || !inverseLayer) return;

		await expect(baseLayer.querySelectorAll('[data-landing-content="base"]')).toHaveLength(1);
		await expect(inverseLayer.querySelectorAll('[data-landing-content="inverse"]')).toHaveLength(1);
		await expect(baseLayer).not.toHaveAttribute('aria-hidden');
		await expect(baseLayer).not.toHaveAttribute('inert');
		await expect(inverseLayer).toHaveAttribute('aria-hidden', 'true');
		await expect(inverseLayer).toHaveAttribute('inert');
		await expect(getComputedStyle(inverseLayer).pointerEvents).toBe('none');

		for (const layer of [baseLayer, inverseLayer]) {
			const style = getComputedStyle(layer);
			await expect(style.position).toBe('absolute');
			await expect(style.inset).toBe('0px');
		}
		await expect(getComputedStyle(baseLayer).clipPath).toBe('none');
		await expect(getComputedStyle(inverseLayer).clipPath).toContain(clip.id);
		await expect(getComputedStyle(puddle).getPropertyValue('--puddle-clip')).toContain(clip.id);

		await expectMatchingBounds(baseLayer, inverseLayer);
		await expectMatchingBounds(hero, puddle);
	}

	async function expectPuddleFillsHero(
		canvasElement: HTMLElement,
		expectedProfile: 'compact' | 'medium' | 'expanded' | 'large',
	) {
		await settleLayout(canvasElement.ownerDocument);

		const hero = canvasElement.querySelector<HTMLElement>('[data-landing-hero]');
		const puddle = canvasElement.querySelector<HTMLElement>('[data-puddle-host]');

		await expect(hero).not.toBeNull();
		await expect(puddle).not.toBeNull();
		if (!hero || !puddle) return;

		await expect(puddle).toHaveAttribute('data-puddle-profile', expectedProfile);

		const heroBounds = hero.getBoundingClientRect();
		const puddleBounds = puddle.getBoundingClientRect();

		await expect(heroBounds.height).toBeGreaterThan(0);
		await expect(puddleBounds.height).toBeGreaterThan(0);
		await expect(puddleBounds.left).toBeCloseTo(heroBounds.left, 0);
		await expect(puddleBounds.top).toBeCloseTo(heroBounds.top, 0);
		await expect(puddleBounds.width).toBeCloseTo(heroBounds.width, 0);
		await expect(puddleBounds.height).toBeCloseTo(heroBounds.height, 0);
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
		await expect(hiddenTitles).toHaveLength(2);
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
		const cta = canvas.getByRole('link', { name: 'Join the jam' });
		const baseVisual = canvasElement.querySelector<HTMLElement>(
			'[data-clip-aware-visual="base"] [data-button-surface]',
		);
		const inverseVisual = canvasElement.querySelector<HTMLElement>(
			'[data-clip-aware-visual="inverse"] [data-button-surface]',
		);

		await expect(canvas.queryByRole('button', { name: 'Join the jam' })).toBeNull();
		await expect(cta).toHaveAttribute('href', '/join');
		await expect(getComputedStyle(cta).pointerEvents).toBe('auto');
		await expect(canvas.getAllByRole('link', { name: 'Join the jam' })).toHaveLength(1);
		await expect(baseVisual).not.toBeNull();
		await expect(inverseVisual).not.toBeNull();
		if (!baseVisual || !inverseVisual) return;

		await expect(baseVisual.closest('[data-landing-layer]')).toHaveAttribute(
			'data-landing-layer',
			'base',
		);
		await expect(inverseVisual.closest('[data-landing-layer]')).toHaveAttribute(
			'data-landing-layer',
			'inverse',
		);
		await expect(cta.closest('[data-landing-layer]')).toHaveAttribute('data-landing-layer', 'base');
		await expectMatchingBounds(baseVisual, inverseVisual);
		await expectMatchingBounds(baseVisual, cta);
	}

	async function expectNoCta(canvasElement: HTMLElement) {
		const canvas = within(canvasElement);

		await expect(canvas.queryByText('Join the jam', { exact: true })).toBeNull();
		await expect(canvasElement.querySelector('[data-clip-aware-button]')).toBeNull();
		await expect(canvasElement.querySelectorAll('[data-clip-aware-visual]')).toHaveLength(0);
		await expect(canvasElement.querySelectorAll('[data-button-surface]')).toHaveLength(0);
		await expect(canvas.queryByRole('button')).toBeNull();
		await expect(canvas.queryByRole('link', { name: 'Join the jam' })).toBeNull();
	}
</script>

<Story
	name="Compact Portrait"
	args={LANDING_HERO_STORY_CASES.compact.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.compact.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'compact');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Medium"
	args={LANDING_HERO_STORY_CASES.medium.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.medium.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'medium');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Expanded"
	args={LANDING_HERO_STORY_CASES.expanded.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.expanded.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'expanded');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Large Desktop"
	args={LANDING_HERO_STORY_CASES.large.args}
	globals={{ viewport: { value: LANDING_HERO_STORY_CASES.large.viewport, isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'large');
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
		await expectLandingLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectNoCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'expanded');
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
		await expectLandingLayers(canvasElement);
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'expanded');
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<style>
	:global(.secondary-accent-preview [data-hero-content-overlay]) {
		clip-path: inset(0 0 0 100%) !important;
	}
</style>
