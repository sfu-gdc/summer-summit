<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';

	import { buttonColors, buttonColorValues, buttonSizes } from '$lib/tokens';

	import SprayBorder from '../SprayBorder/SprayBorder.svelte';

	type ButtonAppearance = 'accent' | 'dark' | 'light';
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
	class={[
		'button-surface pointer-events-none flex whitespace-nowrap uppercase text-base font-semibold leading-6 tracking-normal [color:var(--button-surface-content)]',
		'font-body',
		presentation
			? 'presentation relative inset-auto box-border inline-flex h-[var(--button-surface-height)] w-auto px-[var(--button-surface-padding)]'
			: 'absolute inset-0',
	]}
	style:clip-path={clipPath}
	style:--button-surface-height={sizeValues.height}
	style:--button-surface-padding={sizeValues.inlinePadding}
	style:--button-surface-content={colors.content}
	style:--button-surface-disabled-content={colors.disabledContent}
	style:--button-surface-disabled-surface={colors.disabledSurface}
	style:--button-surface-hover-content={colors.hoverContent}
>
	{#if presentation}
		<span
			aria-hidden="true"
			class="button-surface-sizing inline-flex gap-2 invisible items-center justify-center"
		>
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
		class="inline-flex size-full items-center inset-0 justify-center absolute"
	>
		<span class="button-surface-content inline-flex gap-2 size-full items-center justify-center">
			{@render icon?.()}
			{@render children?.()}
		</span>
	</SprayBorder>
</span>

<style>
	:global(.summer-summit-button:hover:not(:disabled)) .button-surface {
		color: var(--button-surface-hover-content);
	}

	:global(.summer-summit-button:disabled) .button-surface {
		color: var(--button-surface-disabled-content);
		background: var(--button-surface-disabled-surface);
	}
</style>
