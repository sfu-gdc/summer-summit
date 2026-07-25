<script lang="ts">
	import type { Snippet } from 'svelte';

	import { buttonColors, fonts } from '$lib/tokens';

	type ButtonAppearance = 'accent' | 'dark' | 'light';

	interface Props {
		appearance: ButtonAppearance;
		children?: Snippet | undefined;
		clipPath?: string | undefined;
		hidden?: boolean | undefined;
		icon?: Snippet | undefined;
	}

	let { appearance, children, clipPath, hidden = false, icon }: Props = $props();

	const colors = $derived(buttonColors[appearance]);
</script>

<span
	aria-hidden={hidden ? 'true' : undefined}
	data-button-surface={hidden ? 'overlay' : 'base'}
	data-button-underline
	inert={hidden ? true : undefined}
	class="underline-button-surface"
	style:clip-path={clipPath}
	style:--underline-button-content={colors.content}
	style:--underline-button-disabled-content={colors.disabledContent}
	style:--underline-button-font={fonts.body}
	style:--underline-button-hover-content={colors.hoverContent}
>
	<span class="underline-button-content">
		{@render children?.()}
		{@render icon?.()}
		<span aria-hidden="true" class="underline-button-decoration underline-button-dots"></span>
		<span aria-hidden="true" class="underline-button-decoration underline-button-line"></span>
	</span>
</span>

<style>
	.underline-button-surface {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--underline-button-content);
		font-family: var(--underline-button-font);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.5rem;
		letter-spacing: normal;
		text-transform: uppercase;
		white-space: nowrap;
		pointer-events: none;
		transition: color 100ms ease-out;
	}

	.underline-button-content {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.underline-button-decoration {
		position: absolute;
		right: 0;
		bottom: -0.125rem;
		left: 0;
		height: 0.125rem;
	}

	.underline-button-dots {
		background: repeating-linear-gradient(
			to right,
			currentColor 0 0.125rem,
			transparent 0.125rem 0.3125rem
		);
		transition: opacity 140ms ease-out;
	}

	.underline-button-line {
		background: currentColor;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 180ms ease-out;
	}

	:global(.summer-summit-button:hover:not(:disabled)) .underline-button-surface,
	:global(.pseudo-hover-all .summer-summit-button:not(:disabled)) .underline-button-surface {
		color: var(--underline-button-hover-content);
	}

	:global(.summer-summit-button:hover:not(:disabled)) .underline-button-dots,
	:global(.pseudo-hover-all .summer-summit-button:not(:disabled)) .underline-button-dots {
		opacity: 0;
	}

	:global(.summer-summit-button:hover:not(:disabled)) .underline-button-line,
	:global(.pseudo-hover-all .summer-summit-button:not(:disabled)) .underline-button-line {
		transform: scaleX(1);
	}

	:global(.summer-summit-button:disabled) .underline-button-surface {
		color: var(--underline-button-disabled-content);
	}

	@media (prefers-reduced-motion: reduce) {
		.underline-button-surface,
		.underline-button-dots,
		.underline-button-line {
			transition-duration: 0s;
		}
	}
</style>
