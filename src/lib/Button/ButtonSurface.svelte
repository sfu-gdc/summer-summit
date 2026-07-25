<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';

	import { buttonColors, buttonColorValues, buttonSizes, fonts } from '$lib/tokens';

	import SprayBorder from '../SprayBorder/SprayBorder.svelte';

	type ButtonAppearance = 'dark' | 'light';
	type ButtonSize = keyof typeof buttonSizes;

	interface Props {
		appearance: ButtonAppearance;
		children?: Snippet | undefined;
		clipPath?: string | undefined;
		hidden?: boolean | undefined;
		icon?: Snippet | undefined;
		presentation?: boolean | undefined;
		size: ButtonSize;
		spray?: boolean | ComponentProps<typeof SprayBorder> | undefined;
	}

	let {
		appearance,
		children,
		clipPath,
		hidden = false,
		icon,
		presentation = false,
		size,
		spray,
	}: Props = $props();

	const sizeValues = $derived(buttonSizes[size]);
	// `spray` is always on for now; an object still tunes the border's knobs.
	const sprayOpts = $derived({
		spread: sizeValues.spraySpread,
		radius: sizeValues.sprayRadius,
		...(typeof spray === 'object' ? spray : {}),
	});
	const colorValues = $derived(buttonColorValues[appearance]);
	const colors = $derived(buttonColors[appearance]);
</script>

<span
	aria-hidden={hidden ? 'true' : undefined}
	data-button-surface={hidden ? 'overlay' : 'base'}
	inert={hidden ? true : undefined}
	class={['button-surface', { presentation }]}
	style:clip-path={clipPath}
	style:--button-surface-font={fonts.body}
	style:--button-surface-height={sizeValues.height}
	style:--button-surface-padding={sizeValues.inlinePadding}
	style:--button-surface-content={colors.content}
	style:--button-surface-disabled-content={colors.disabledContent}
	style:--button-surface-disabled-surface={colors.disabledSurface}
	style:--button-surface-hover-content={colors.hoverContent}
>
	{#if presentation}
		<span aria-hidden="true" class="button-surface-sizing">
			{@render icon?.()}
			{@render children?.()}
		</span>
	{/if}
	<SprayBorder
		{...sprayOpts}
		as="span"
		color={colorValues.surface}
		data-spray-radius={sprayOpts.radius}
		data-spray-spread={sprayOpts.spread}
		class=":uno: inline-flex h-full w-full items-center justify-center"
		style="position: absolute; inset: 0; width: 100%; height: 100%;"
	>
		<span class="button-surface-content">
			{@render icon?.()}
			{@render children?.()}
		</span>
	</SprayBorder>
</span>

<style>
	.button-surface {
		position: absolute;
		inset: 0;
		display: flex;
		color: var(--button-surface-content);
		font-family: var(--button-surface-font);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.5rem;
		letter-spacing: normal;
		text-transform: uppercase;
		white-space: nowrap;
		pointer-events: none;
	}

	.button-surface-content,
	.button-surface-sizing {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.button-surface-content {
		width: 100%;
		height: 100%;
	}

	.button-surface-sizing {
		visibility: hidden;
	}

	.button-surface.presentation {
		position: relative;
		inset: auto;
		display: inline-flex;
		box-sizing: border-box;
		width: auto;
		height: var(--button-surface-height);
		padding-inline: var(--button-surface-padding);
	}

	:global(.summer-summit-button:hover:not(:disabled)) .button-surface {
		color: var(--button-surface-hover-content);
	}

	:global(.summer-summit-button:disabled) .button-surface {
		color: var(--button-surface-disabled-content);
		background: var(--button-surface-disabled-surface);
	}
</style>
