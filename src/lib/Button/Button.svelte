<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	import type { ButtonRootProps } from 'bits-ui';

	import { buttonColors, buttonSizes, fonts } from '$lib/tokens';

	import type SprayBorder from '../SprayBorder/SprayBorder.svelte';
	import ButtonSurface from './ButtonSurface.svelte';

	export type ButtonAppearance = 'accent' | 'dark' | 'light';
	export type ButtonSize = keyof typeof buttonSizes;
	export interface ButtonOverlay {
		appearance: ButtonAppearance;
		clipPath: string;
	}

	type Props = ButtonRootProps & {
		/** Accent, dark navigation, or light inverted treatment. */
		appearance?: ButtonAppearance | undefined;
		/** Optional icon rendered before the label. */
		icon?: Snippet | undefined;
		/** Use the large size for prominent call-to-actions. */
		size?: ButtonSize | undefined;
		/** Swap the solid fill for a WebGL spray-paint border. `true` for defaults, or tune it. */
		spray?: boolean | ComponentProps<typeof SprayBorder> | undefined;
		/** Optional alternate visual treatment clipped over the same semantic control. */
		overlay?: ButtonOverlay | undefined;
		/** Keep Button semantics and locked metrics while another layer supplies its visuals. */
		visuals?: boolean | undefined;
	};

	let {
		appearance = 'dark',
		size = 'default',
		icon,
		children,
		class: className,
		overlay,
		spray,
		style,
		visuals = true,
		...restProps
	}: Props = $props();

	const sizeValues = $derived(buttonSizes[size]);
	const buttonStyle = $derived(
		[
			style,
			`--button-disabled-surface:${buttonColors[appearance].disabledSurface}`,
			`--button-disabled-content:${buttonColors[appearance].disabledContent}`,
			`--button-focus-ring:${buttonColors.focusRing}`,
			`--button-font-family:${fonts.body}`,
			`--button-height:${sizeValues.height}`,
			`--button-inline-padding:${sizeValues.inlinePadding}`,
		]
			.filter(Boolean)
			.join(';'),
	);
</script>

<!-- Upcast collapses bits-ui's Anchor|Button union at the spread so it doesn't hit TS2590 (union too complex). -->
<svelte:element
	this={restProps.href != null ? 'a' : 'button'}
	{...restProps as HTMLAttributes<HTMLElement>}
	style={buttonStyle}
	class={[
		':uno: summer-summit-button bg-transparent text-base outline-2 outline-transparent outline-offset--2 inline-flex gap-2 cursor-pointer select-none whitespace-nowrap uppercase transition-all duration-100 transition-ease-out items-center justify-center disabled:cursor-not-allowed focus-visible:not-disabled:outline-offset-3',
		className,
	]}
>
	<span
		aria-hidden={visuals ? 'true' : undefined}
		class={['button-layout', { semantic: !visuals }]}
	>
		{@render icon?.()}
		{@render children?.()}
	</span>
	{#if visuals}
		<ButtonSurface {appearance} {children} {icon} {size} {spray} />
		{#if overlay}
			<ButtonSurface
				appearance={overlay.appearance}
				{children}
				clipPath={overlay.clipPath}
				hidden
				{icon}
				{size}
				{spray}
			/>
		{/if}
	{/if}
</svelte:element>

<style>
	:global(.summer-summit-button) {
		position: relative;
		isolation: isolate;
		font-family: var(--button-font-family);
		font-weight: 600;
		height: var(--button-height);
		padding-inline: var(--button-inline-padding);
		letter-spacing: normal;
	}

	.button-layout {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
		visibility: hidden;
	}

	.button-layout.semantic {
		visibility: visible;
		opacity: 0;
	}

	:global(.summer-summit-button:has([data-button-surface]):disabled) {
		color: var(--button-disabled-content);
		background: var(--button-disabled-surface);
	}

	:global(.summer-summit-button:active) {
		transform: scale(0.98);
	}

	:global(.summer-summit-button:focus-visible:not(:disabled)) {
		border-radius: 0.25rem;
		outline-color: var(--button-focus-ring);
	}
</style>
