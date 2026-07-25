<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';

	import { expect, within } from 'storybook/test';

	import LandingHero from './LandingHero.svelte';

	type Args = ComponentProps<typeof LandingHero>;

	const eventArgs = {
		titleLines: ['SUMMER SUMMIT', 'GAME JAM 2026'],
		dateLabel: 'SEPT 4 - 6',
		organizerLabel: 'GAME DEV CLUB X IATSU 2026',
		locationLabel: 'SFU BURNABY CAMPUS',
		navItems: [],
		cta: { label: 'Join the jam', href: '/join' },
	} satisfies Args;

	const viewports = {
		compact: {
			name: 'Compact portrait',
			styles: { width: '390px', height: '844px' },
			type: 'mobile',
		},
		medium: {
			name: 'Medium',
			styles: { width: '768px', height: '1024px' },
			type: 'tablet',
		},
		expanded: {
			name: 'Expanded',
			styles: { width: '1280px', height: '800px' },
			type: 'desktop',
		},
		large: {
			name: 'Large desktop',
			styles: { width: '1920px', height: '1080px' },
			type: 'desktop',
		},
	} as const;

	const { Story } = defineMeta({
		title: 'Landing Hero',
		component: LandingHero,
		args: eventArgs,
		parameters: {
			layout: 'fullscreen',
			viewport: { options: viewports },
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

	async function expectDetailAlignment(canvasElement: HTMLElement) {
		await settleLayout(canvasElement.ownerDocument);

		const date = canvasElement.querySelector<HTMLElement>(
			'[data-hero-content] [data-landing-date]',
		);
		const cta = canvasElement.querySelector<HTMLElement>(
			'[data-clip-aware-visual="base"] [data-button-surface]',
		);
		const dateGrid = date?.closest<HTMLElement>('.detail-grid');
		const ctaGrid = cta?.closest<HTMLElement>('.detail-grid');

		await expect(date).not.toBeNull();
		await expect(cta).not.toBeNull();
		await expect(dateGrid).not.toBeNull();
		await expect(ctaGrid).not.toBeNull();
		if (!date || !cta || !dateGrid || !ctaGrid) return;

		const dateBounds = date.getBoundingClientRect();
		const ctaBounds = cta.getBoundingClientRect();
		const dateGridBounds = dateGrid.getBoundingClientRect();
		const ctaGridBounds = ctaGrid.getBoundingClientRect();
		const dateCenter = dateBounds.top + dateBounds.height / 2 - dateGridBounds.top;
		const ctaCenter = ctaBounds.top + ctaBounds.height / 2 - ctaGridBounds.top;

		await expect(dateGridBounds.height).toBeCloseTo(ctaGridBounds.height, 1);
		await expect(dateCenter).toBeCloseTo(ctaCenter, 1);
	}

	async function expectPuddleFillsHero(
		canvasElement: HTMLElement,
		expectedProfile: 'compact' | 'medium' | 'expanded' | 'large',
	) {
		await settleLayout(canvasElement.ownerDocument);

		const hero = canvasElement.querySelector<HTMLElement>('[data-hero]');
		const puddleLayer = canvasElement.querySelector<HTMLElement>('[data-hero-puddle-layer]');
		const puddle = canvasElement.querySelector<HTMLElement>('[data-puddle-host]');

		await expect(hero).not.toBeNull();
		await expect(puddleLayer).not.toBeNull();
		await expect(puddle).not.toBeNull();
		if (!hero || !puddleLayer || !puddle) return;

		await expect(puddle).toHaveAttribute('data-puddle-profile', expectedProfile);

		const heroBounds = hero.getBoundingClientRect();
		const puddleLayerBounds = puddleLayer.getBoundingClientRect();
		const puddleBounds = puddle.getBoundingClientRect();

		await expect(heroBounds.height).toBeGreaterThan(0);
		await expect(getComputedStyle(puddleLayer).position).toBe('absolute');
		await expect(puddleLayerBounds.height).toBeCloseTo(heroBounds.height, 0);
		await expect(puddleBounds.height).toBeGreaterThan(0);
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
				name: 'SUMMER SUMMIT GAME JAM 2026',
			}),
		).toBeInTheDocument();
		await expect(canvas.queryByRole('navigation')).toBeNull();
		await expect(canvas.queryByRole('button', { name: /about|schedule|faq/i })).toBeNull();
		await expect(canvas.queryByRole('link', { name: /about|schedule|faq/i })).toBeNull();
		await expect(hiddenTitles).toHaveLength(2);
		await expect(
			Array.from(hiddenTitles).every((title) => title.closest('[aria-hidden="true"]') !== null),
		).toBe(true);

		for (const copy of ['SEPT 4 - 6', 'GAME DEV CLUB X IATSU 2026', 'SFU BURNABY CAMPUS']) {
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

		await expect(canvas.queryByRole('button', { name: 'Join the jam' })).toBeNull();
		await expect(cta).toHaveAttribute('href', '/join');
		await expect(getComputedStyle(cta).pointerEvents).toBe('auto');
		await expect(canvas.getAllByRole('link', { name: 'Join the jam' })).toHaveLength(1);
	}

	async function expectNoCta(canvasElement: HTMLElement) {
		const canvas = within(canvasElement);

		await expect(canvas.queryByText('Join the jam', { exact: true })).toBeNull();
		await expect(canvasElement.querySelector('[data-clip-aware-button]')).toBeNull();
	}
</script>

<Story
	name="Compact Portrait"
	globals={{ viewport: { value: 'compact', isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'compact');
		await expectDetailAlignment(canvasElement);
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Medium"
	globals={{ viewport: { value: 'medium', isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'medium');
		await expectDetailAlignment(canvasElement);
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Expanded"
	globals={{ viewport: { value: 'expanded', isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'expanded');
		await expectDetailAlignment(canvasElement);
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Large Desktop"
	globals={{ viewport: { value: 'large', isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectLandingSemantics(canvasElement);
		await expectDestinationCta(canvasElement);
		await expectPuddleFillsHero(canvasElement, 'large');
		await expectDetailAlignment(canvasElement);
		await expectNoHorizontalOverflow(canvasElement);
	}}
/>

<Story
	name="Without CTA"
	args={{ cta: undefined }}
	globals={{ viewport: { value: 'expanded', isRotated: false } }}
	play={async ({ canvasElement }) => {
		await expectNoCta(canvasElement);
	}}
/>

<Story
	name="Reduced Motion"
	globals={{ viewport: { value: 'expanded', isRotated: false } }}
	parameters={{ chromatic: { prefersReducedMotion: 'reduce' } }}
/>
