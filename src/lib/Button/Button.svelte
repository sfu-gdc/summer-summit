<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	import type { ButtonRootProps } from 'bits-ui';

	import { buttonColors, buttonColorValues, buttonSizes, fonts } from '$lib/tokens';

	import SprayBorder from '../SprayBorder/SprayBorder.svelte';

	export type ButtonAppearance = 'dark' | 'light';
	export type ButtonSize = keyof typeof buttonSizes;

	type Props = ButtonRootProps & {
		/** Dark navigation treatment or the light, inverted call-to-action treatment. */
		appearance?: ButtonAppearance;
		/** Optional icon rendered before the label. */
		icon?: Snippet;
		/** Use the large size for prominent call-to-actions. */
		size?: ButtonSize;
		/** Swap the solid fill for a WebGL spray-paint border. `true` for defaults, or tune it. */
		spray?: boolean | ComponentProps<typeof SprayBorder>;
	};

	let {
		appearance = 'dark',
		size = 'default',
		icon,
		children,
		class: className,
		spray,
		style,
		...restProps
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
	const buttonStyle = $derived(
		[
			style,
			`--button-content:${colors.content}`,
			`--button-hover-content:${colors.hoverContent}`,
			`--button-disabled-surface:${colors.disabledSurface}`,
			`--button-disabled-content:${colors.disabledContent}`,
			`--button-focus-ring:${buttonColors.focusRing}`,
			`--button-font-family:${fonts.body}`,
			`--button-height:${sizeValues.height}`,
			`--button-inline-padding:${sizeValues.inlinePadding}`,
		]
			.filter(Boolean)
			.join(';'),
	);
</script>

<!-- bits-ui Button.Root can't delegate its element, so SprayBorder *is* the native button/anchor. -->
<!-- Upcast collapses bits-ui's Anchor|Button union at the spread so it doesn't hit TS2590 (union too complex). -->
<SprayBorder
	{...sprayOpts}
	as={restProps.href != null ? 'a' : 'button'}
	{...restProps as HTMLAttributes<HTMLElement>}
	color={colorValues.surface}
	style={buttonStyle}
	class={[
		':uno: summer-summit-button bg-transparent text-base outline-2 outline-transparent outline-offset--2 inline-flex gap-2 cursor-pointer select-none whitespace-nowrap uppercase transition-all duration-100 transition-ease-out items-center justify-center disabled:cursor-not-allowed active:scale-[0.98] focus-visible:rounded focus-visible:not-disabled:outline-offset-3',
		className,
	]}
>
	<span class="inline-flex gap-2 items-center relative z-10">
		{@render icon?.()}
		{@render children?.()}
	</span>
</SprayBorder>

<style>
	:global(.summer-summit-button) {
		color: var(--button-content);
		font-family: var(--button-font-family);
		font-weight: 600;
		height: var(--button-height);
		padding-inline: var(--button-inline-padding);
		letter-spacing: normal;
	}

	:global(.summer-summit-button:hover:not(:disabled)) {
		color: var(--button-hover-content);
	}

	:global(.summer-summit-button:disabled) {
		color: var(--button-disabled-content);
		background: var(--button-disabled-surface);
	}

	:global(.summer-summit-button:focus-visible:not(:disabled)) {
		outline-color: var(--button-focus-ring);
	}
</style>
