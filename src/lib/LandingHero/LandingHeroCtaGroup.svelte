<script lang="ts">
	import ClipAwareButton from '../Button/ClipAwareButton.svelte';
	import type { LandingHeroLayer } from './LandingHeroContent.svelte';
	import type { LandingHeroActions } from './types';

	interface Props {
		actionSet: LandingHeroActions;
		layer: LandingHeroLayer;
	}

	let props: Props = $props();
</script>

<div
	class="flex flex-col gap-1 w-full items-stretch justify-center md:flex-row lg:gap-4 md:gap-2 md:items-center lg:justify-end"
	data-landing-actions
>
	<ClipAwareButton
		appearance="light"
		inverseAppearance="primary"
		control={props.layer === 'base' ? { href: props.actionSet.discord.href } : undefined}
		layer={props.layer}
		variant="underline"
	>
		{props.actionSet.discord.label}
		<span aria-hidden="true" class="i-pixel-discord size-6"></span>
	</ClipAwareButton>
	<ClipAwareButton
		appearance="secondary"
		inverseAppearance="light"
		control={props.layer === 'base' ? { href: props.actionSet.tickets.href } : undefined}
		layer={props.layer}
		size="large"
	>
		{props.actionSet.tickets.label}
		<span aria-hidden="true" class="i-pixelarticons-arrow-right-box size-6"></span>
	</ClipAwareButton>
</div>

<style>
	[data-landing-actions] :global([data-clip-aware-variant='spray']) {
		order: 1;
	}

	[data-landing-actions] :global([data-clip-aware-variant='underline']) {
		order: 2;
	}

	@media (width < 32rem) {
		[data-landing-actions] :global([data-clip-aware-visual]),
		[data-landing-actions] :global([data-button-surface]) {
			width: 100%;
		}
	}

	@media (width >= 64rem) {
		[data-landing-actions] :global([data-clip-aware-variant='underline']) {
			order: 1;
		}

		[data-landing-actions] :global([data-clip-aware-variant='spray']) {
			order: 2;
		}
	}
</style>
