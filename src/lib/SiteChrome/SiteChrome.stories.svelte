<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Site Chrome',
		parameters: {
			layout: 'fullscreen',
			chromatic: { viewports: [1280] },
		},
	});
</script>

<script lang="ts">
	import { createFloodPlan, floodMaskAtProgress } from '$lib/PageTransition/flood';
	import { PageTransitionCoordinator } from '$lib/PageTransition/pageTransition.svelte';
	import PageTransitionOverlay from '$lib/PageTransition/PageTransitionOverlay.svelte';
	import { puddlePath } from '$lib/Puddle/render/puddleRenderer';
	import { heroColors } from '$lib/tokens';

	import SiteChrome from './SiteChrome.svelte';

	const cols = 40;
	const rows = 24;
	const cellSize = 32;

	function maskWhere(predicate: (x: number, y: number) => boolean): Uint8Array {
		return Uint8Array.from({ length: cols * rows }, (_, index) => {
			const x = index % cols;
			const y = Math.floor(index / cols);
			return predicate(x, y) ? 1 : 0;
		});
	}

	function coordinatorFor(
		mask: Uint8Array,
		phase: PageTransitionCoordinator['phase'],
		overlayVisible: boolean,
	): PageTransitionCoordinator {
		const coordinator = new PageTransitionCoordinator();
		coordinator.overlayPath = puddlePath(mask, cols, rows, cellSize);
		coordinator.overlayTransform = 'none';
		coordinator.overlayClipTransform = 'translate(0 0)';
		coordinator.overlayVisible = overlayVisible;
		coordinator.phase = phase;
		return coordinator;
	}

	const restingCoordinator = coordinatorFor(
		maskWhere((x, y) => ((x - 20) / 14) ** 2 + ((y - 14) / 7) ** 2 <= 1),
		'idle',
		true,
	);
	const partialSeed = maskWhere(
		(x, y) =>
			((x - 22) / 8) ** 2 + ((y - 17) / 4) ** 2 <= 1 ||
			((x - 5) / 2) ** 2 + ((y - 5) / 2) ** 2 <= 1,
	);
	const partialCoordinator = coordinatorFor(
		floodMaskAtProgress(createFloodPlan(partialSeed, cols, rows), 0.42),
		'covering',
		true,
	);
	const darkCoordinator = coordinatorFor(new Uint8Array(cols * rows).fill(1), 'idle', false);
</script>

{#snippet homeResting()}
	<div
		class="min-h-screen"
		style:--page-transition-color={heroColors.outline}
		style:background={heroColors.background}
	>
		<PageTransitionOverlay coordinator={restingCoordinator} />
		<SiteChrome coordinator={restingCoordinator} routeId="/" />
	</div>
{/snippet}

{#snippet transitionPartial()}
	<div
		class="min-h-screen"
		style:--page-transition-color={heroColors.outline}
		style:background={heroColors.background}
	>
		<PageTransitionOverlay coordinator={partialCoordinator} />
		<SiteChrome coordinator={partialCoordinator} routeId="/" />
	</div>
{/snippet}

{#snippet darkPage()}
	<div
		class="min-h-screen"
		style:--page-transition-color={heroColors.outline}
		style:background={heroColors.outline}
	>
		<PageTransitionOverlay coordinator={darkCoordinator} />
		<SiteChrome coordinator={darkCoordinator} routeId="/about" />
	</div>
{/snippet}

<Story name="Home Resting" template={homeResting} />
<Story name="Transition Partial" template={transitionPartial} />
<Story name="Dark Page" template={darkPage} />
