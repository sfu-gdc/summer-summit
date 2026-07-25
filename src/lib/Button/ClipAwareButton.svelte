<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { ClassValue, HTMLAttributeAnchorTarget, MouseEventHandler } from 'svelte/elements';

	import { buttonColors, type buttonSizes } from '$lib/tokens';

	import type SprayBorder from '../SprayBorder/SprayBorder.svelte';
	import Button from './Button.svelte';
	import ButtonSurface from './ButtonSurface.svelte';

	export type ClipAwareButtonAppearance = 'dark' | 'light';
	export type ClipAwareButtonSize = keyof typeof buttonSizes;

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
		/** Visual treatment outside the puddle. */
		appearance?: ClipAwareButtonAppearance | undefined;
		/** Visual treatment inside the puddle. */
		inverseAppearance?: ClipAwareButtonAppearance | undefined;
		/** The full-host puddle clip. */
		clipPath: string;
		/** Repeats the caller's normal layout around each visual and semantic rendering. */
		placement: Snippet<[Snippet]>;
		/** Native-control props. Omit this to render a non-interactive presentation. */
		control?: ClipAwareButtonControl | undefined;
		icon?: Snippet | undefined;
		children?: Snippet | undefined;
		size?: ClipAwareButtonSize | undefined;
		spray?: boolean | ComponentProps<typeof SprayBorder> | undefined;
		class?: ClassValue | undefined;
	}

	let {
		appearance = 'dark',
		inverseAppearance = 'light',
		clipPath,
		placement,
		control,
		icon,
		children,
		size = 'default',
		spray,
		class: className,
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

{#snippet baseVisual()}
	<span class="visual-state" data-clip-aware-visual="base">
		<ButtonSurface {appearance} {children} {icon} presentation {size} {spray} />
	</span>
{/snippet}

{#snippet inverseVisual()}
	<span class="visual-state" data-clip-aware-visual="inverse">
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

{#snippet semanticControl()}
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
{/snippet}

<div
	class={['clip-aware-button', className]}
	data-clip-aware-button
	style:--clip-aware-path={clipPath}
	style:--clip-aware-focus-ring={buttonColors.focusRing}
>
	<div class="layer base-layer" aria-hidden="true" inert>
		{@render placement(baseVisual)}
	</div>

	<div class="layer inverse-layer" aria-hidden="true" inert>
		{@render placement(inverseVisual)}
	</div>

	{#if control}
		<div class="layer control-layer">
			{@render placement(semanticControl)}
		</div>
	{/if}
</div>

<style>
	.clip-aware-button,
	.layer {
		position: absolute;
		inset: 0;
	}

	.clip-aware-button {
		z-index: 0;
		isolation: isolate;
		pointer-events: none;
	}

	.layer {
		pointer-events: none;
	}

	.base-layer {
		z-index: 0;
	}

	.inverse-layer {
		z-index: 1;
		clip-path: var(--clip-aware-path);
	}

	.control-layer {
		z-index: 2;
	}

	.control-layer :global(.semantic-control) {
		pointer-events: auto;
	}

	.visual-state {
		display: inline-flex;
		outline: 2px solid transparent;
		outline-offset: -2px;
		transition:
			transform 100ms ease-out,
			outline-offset 100ms ease-out;
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

	.control-layer :global(.semantic-control:focus-visible) {
		outline-color: transparent;
	}
</style>
