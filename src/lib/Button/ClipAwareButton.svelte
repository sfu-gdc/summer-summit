<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { ClassValue, HTMLAttributeAnchorTarget, MouseEventHandler } from 'svelte/elements';

	import { buttonColors, type buttonSizes } from '$lib/tokens';

	import type SprayBorder from '../SprayBorder/SprayBorder.svelte';
	import Button from './Button.svelte';
	import ButtonSurface from './ButtonSurface.svelte';

	export type ClipAwareButtonAppearance = 'dark' | 'light';
	export type ClipAwareButtonSize = keyof typeof buttonSizes;

	export interface ClipAwareButtonLayers {
		base: Snippet;
		inverse: Snippet;
	}

	export interface ClipAwareButtonControl {
		/** Render an anchor when present; otherwise render a button. */
		href?: string | undefined;
		type?: 'button' | 'reset' | 'submit' | undefined;
		disabled?: boolean | undefined;
		target?: HTMLAttributeAnchorTarget | undefined;
		rel?: string | undefined;
		ariaLabel?: string | undefined;
		onclick?: MouseEventHandler<HTMLElement> | undefined;
		class?: ClassValue | undefined;
	}

	export interface ClipAwareButtonProps {
		/**
		 * Places the paired presentations under one `[data-clip-aware-button]` ancestor.
		 * The caller owns that state scope so composed layers can remain direct children.
		 */
		compose: Snippet<[ClipAwareButtonLayers]>;
		/** Visual treatment outside the puddle. */
		appearance?: ClipAwareButtonAppearance | undefined;
		/** Visual treatment inside the puddle. */
		inverseAppearance?: ClipAwareButtonAppearance | undefined;
		/** Native-control props. Omit this to render a non-interactive presentation. */
		control?: ClipAwareButtonControl | undefined;
		icon?: Snippet | undefined;
		children?: Snippet | undefined;
		size?: ClipAwareButtonSize | undefined;
		spray?: boolean | ComponentProps<typeof SprayBorder> | undefined;
	}

	let {
		compose,
		appearance = 'dark',
		inverseAppearance = 'light',
		control,
		icon,
		children,
		size = 'default',
		spray,
	}: ClipAwareButtonProps = $props();

	const sharedButtonProps = $derived({
		appearance,
		size,
		visuals: false,
		...(children ? { children } : {}),
		...(icon ? { icon } : {}),
		...(spray !== undefined ? { spray } : {}),
	});
</script>

{#snippet baseLayer()}
	<span
		class="visual-state"
		data-clip-aware-visual="base"
		style:--clip-aware-focus-ring={buttonColors.focusRing}
	>
		<span class="presentation-surface" aria-hidden="true" inert>
			<ButtonSurface {appearance} {children} {icon} presentation {size} {spray} />
		</span>
		{#if control}
			{#if control.href != null}
				<Button
					{...sharedButtonProps}
					aria-label={control.ariaLabel}
					class={['semantic-control', control.class]}
					href={control.href}
					onclick={control.onclick}
					rel={control.rel}
					target={control.target}
				/>
			{:else}
				<Button
					{...sharedButtonProps}
					aria-label={control.ariaLabel}
					class={['semantic-control', control.class]}
					disabled={control.disabled}
					onclick={control.onclick}
					type={control.type}
				/>
			{/if}
		{/if}
	</span>
{/snippet}

{#snippet inverseLayer()}
	<span
		class="visual-state"
		data-clip-aware-visual="inverse"
		style:--clip-aware-focus-ring={buttonColors.focusRing}
	>
		<ButtonSurface
			appearance={inverseAppearance}
			{children}
			hidden
			{icon}
			presentation
			{size}
			{spray}
		/>
	</span>
{/snippet}

{@render compose({ base: baseLayer, inverse: inverseLayer })}

<style>
	.presentation-surface {
		display: contents;
	}

	.visual-state {
		display: inline-flex;
		position: relative;
		outline: 2px solid transparent;
		outline-offset: -2px;
		transition:
			transform 100ms ease-out,
			outline-offset 100ms ease-out;
	}

	.visual-state :global(.semantic-control) {
		inset: 0;
		height: 100%;
		position: absolute;
		width: 100%;
		pointer-events: auto;
	}

	:global(
		[data-clip-aware-button]:has(.semantic-control:hover:not(:disabled):not([aria-disabled='true']))
			[data-button-surface]
	),
	:global([data-clip-aware-button].pseudo-hover-all [data-button-surface]) {
		color: var(--button-surface-hover-content);
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control:active:not(:disabled):not([aria-disabled='true'])
			)
			[data-clip-aware-visual]
	),
	:global([data-clip-aware-button].pseudo-active-all [data-clip-aware-visual]) {
		transform: scale(0.98);
	}

	:global([data-clip-aware-button]:has(.semantic-control:focus-visible) [data-clip-aware-visual]),
	:global([data-clip-aware-button].pseudo-focus-visible-all [data-clip-aware-visual]) {
		border-radius: 0.25rem;
		outline-color: var(--clip-aware-focus-ring);
		outline-offset: 3px;
	}

	:global(
		[data-clip-aware-button]:has(.semantic-control:is(:disabled, [aria-disabled='true']))
			[data-button-surface]
	) {
		color: var(--button-surface-disabled-content);
		background: var(--button-surface-disabled-surface);
	}

	.visual-state :global(.semantic-control:focus-visible) {
		outline-color: transparent;
	}
</style>
