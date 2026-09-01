<script lang="ts">
	import type { PageTransitionCoordinator } from './pageTransition.svelte';

	interface Props {
		coordinator: PageTransitionCoordinator;
	}

	let { coordinator }: Props = $props();
</script>

{#if coordinator.overlayVisible}
	<svg
		aria-hidden="true"
		class="size-full pointer-events-none [shape-rendering:crispEdges] inset-0 fixed z-20"
		data-page-transition-overlay
	>
		<path
			d={coordinator.overlayPath}
			class="fill-[var(--page-transition-color)]"
			style:transform={coordinator.overlayTransform}
			style:transform-box="view-box"
		></path>
	</svg>
{/if}
