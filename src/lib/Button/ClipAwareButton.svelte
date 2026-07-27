<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { ClassValue, HTMLAttributeAnchorTarget, MouseEventHandler } from 'svelte/elements';

	import { buttonColors, type buttonSizes } from '$lib/tokens';

	import type SprayBorder from '../SprayBorder/SprayBorder.svelte';
	import Button from './Button.svelte';
	import ButtonSurface from './ButtonSurface.svelte';
	import UnderlineButtonSurface from './UnderlineButtonSurface.svelte';

	export type ClipAwareButtonAppearance = 'primary' | 'secondary' | 'dark' | 'light';
	export type ClipAwareButtonLayer = 'base' | 'inverse';
	export type ClipAwareButtonSize = keyof typeof buttonSizes;
	export type ClipAwareButtonVariant = 'spray' | 'underline';

	interface ClipAwareButtonLayerSnippets {
		base: Snippet;
		inverse: Snippet;
	}

	/** @deprecated Use two `ClipAwareButton` instances with explicit `layer` props. */
	export type ClipAwareButtonLayers = ClipAwareButtonLayerSnippets;

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

	interface ClipAwareButtonCommonProps {
		/** Visual treatment outside the puddle. */
		appearance?: ClipAwareButtonAppearance | undefined;
		/** Visual treatment inside the puddle. */
		inverseAppearance?: ClipAwareButtonAppearance | undefined;
		/** Native-control props. Inverse layers never render a semantic control. */
		control?: ClipAwareButtonControl | undefined;
		icon?: Snippet | undefined;
		children?: Snippet | undefined;
		size?: ClipAwareButtonSize | undefined;
		spray?: boolean | ComponentProps<typeof SprayBorder> | undefined;
		variant?: ClipAwareButtonVariant | undefined;
	}

	export type ClipAwareButtonProps = ClipAwareButtonCommonProps &
		(
			| {
					/** Selects the single presentation rendered by this instance. */
					layer: ClipAwareButtonLayer;
					compose?: never;
			  }
			| {
					/**
					 * Places paired presentations under one caller-owned state scope.
					 * Prefer explicit `base` and `inverse` instances for new compositions.
					 */
					compose: Snippet<[ClipAwareButtonLayerSnippets]>;
					layer?: never;
			  }
		);

	let {
		layer,
		compose,
		appearance = 'dark',
		inverseAppearance = 'light',
		control,
		icon,
		children,
		size = 'default',
		spray,
		variant = 'spray',
	}: ClipAwareButtonProps = $props();

	const sharedButtonProps = $derived({
		appearance,
		size,
		variant,
		visuals: false,
		...(children ? { children } : {}),
		...(icon ? { icon } : {}),
		...(spray !== undefined ? { spray } : {}),
	});
	const selectedLayer = $derived(
		layer === 'base' ? baseLayer : layer === 'inverse' ? inverseLayer : undefined,
	);
</script>

{#snippet baseLayer()}
	<span
		class="visual-state outline-2 outline-transparent outline-offset--2 inline-flex [transition:transform_100ms_ease-out,outline-offset_100ms_ease-out] relative"
		data-clip-aware-visual="base"
		data-clip-aware-variant={variant}
		style:--clip-aware-focus-ring={buttonColors.focusRing}
	>
		<span class="presentation-surface contents" aria-hidden="true" inert>
			{#if variant === 'underline'}
				<UnderlineButtonSurface {appearance} {children} {icon} presentation {size} />
			{:else}
				<ButtonSurface {appearance} {children} {icon} presentation {size} {spray} />
			{/if}
		</span>
		{#if control && layer !== 'inverse'}
			{#if control.href != null}
				<Button
					{...sharedButtonProps}
					aria-label={control.ariaLabel}
					class={[
						'semantic-control pointer-events-auto !absolute !inset-0 !size-full',
						control.class,
					]}
					href={control.href}
					onclick={control.onclick}
					rel={control.rel}
					target={control.target}
				/>
			{:else}
				<Button
					{...sharedButtonProps}
					aria-label={control.ariaLabel}
					class={[
						'semantic-control pointer-events-auto !absolute !inset-0 !size-full',
						control.class,
					]}
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
		class="visual-state outline-2 outline-transparent outline-offset--2 inline-flex [transition:transform_100ms_ease-out,outline-offset_100ms_ease-out] relative"
		data-clip-aware-visual="inverse"
		data-clip-aware-variant={variant}
		style:--clip-aware-focus-ring={buttonColors.focusRing}
	>
		{#if variant === 'underline'}
			<UnderlineButtonSurface
				appearance={inverseAppearance}
				{children}
				hidden
				{icon}
				presentation
				{size}
			/>
		{:else}
			<ButtonSurface
				appearance={inverseAppearance}
				{children}
				hidden
				{icon}
				presentation
				{size}
				{spray}
			/>
		{/if}
	</span>
{/snippet}

{#if compose}
	{@render compose({ base: baseLayer, inverse: inverseLayer })}
{:else}
	{@render selectedLayer?.()}
{/if}

<style>
	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='spray']:hover:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='spray']
			[data-button-surface]
	),
	:global(
		[data-clip-aware-button].pseudo-hover-all
			[data-clip-aware-variant='spray']
			[data-button-surface]
	) {
		color: var(--button-surface-hover-content);
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='spray']:hover:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='spray']
			[data-button-surface]
	),
	:global(
		[data-clip-aware-button].pseudo-hover-all
			[data-clip-aware-variant='spray']
			[data-button-surface]
	) {
		transform: scale(1.01);
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='spray']:active:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='spray']
	),
	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='underline']:active:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='underline']
	),
	:global([data-clip-aware-button].pseudo-active-all [data-clip-aware-visual]) {
		transform: scale(0.98);
	}

	:global(
		[data-clip-aware-button]:has(.semantic-control[data-button-variant='spray']:focus-visible)
			[data-clip-aware-variant='spray']
	),
	:global(
		[data-clip-aware-button]:has(.semantic-control[data-button-variant='underline']:focus-visible)
			[data-clip-aware-variant='underline']
	),
	:global([data-clip-aware-button].pseudo-focus-visible-all [data-clip-aware-visual]) {
		border-radius: 0.25rem;
		outline-color: var(--clip-aware-focus-ring);
		outline-offset: 3px;
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='spray']:is(:disabled, [aria-disabled='true'])
			)
			[data-clip-aware-variant='spray']
			[data-button-surface]
	) {
		color: var(--button-surface-disabled-content);
		background: var(--button-surface-disabled-surface);
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='underline']:hover:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='underline']
			[data-button-underline]
	),
	:global(
		[data-clip-aware-button].pseudo-hover-all
			[data-clip-aware-variant='underline']
			[data-button-underline]
	) {
		color: var(--underline-button-hover-content);
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='underline']:hover:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='underline']
			.underline-button-dots
	),
	:global(
		[data-clip-aware-button].pseudo-hover-all
			[data-clip-aware-variant='underline']
			.underline-button-dots
	) {
		opacity: 0;
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='underline']:hover:not(:disabled):not(
						[aria-disabled='true']
					)
			)
			[data-clip-aware-variant='underline']
			.underline-button-line
	),
	:global(
		[data-clip-aware-button].pseudo-hover-all
			[data-clip-aware-variant='underline']
			.underline-button-line
	) {
		transform: scaleX(1);
	}

	:global(
		[data-clip-aware-button]:has(
				.semantic-control[data-button-variant='underline']:is(:disabled, [aria-disabled='true'])
			)
			[data-clip-aware-variant='underline']
			[data-button-underline]
	) {
		color: var(--underline-button-disabled-content);
	}

	.visual-state :global(.semantic-control:focus-visible) {
		outline-color: transparent;
	}
</style>
