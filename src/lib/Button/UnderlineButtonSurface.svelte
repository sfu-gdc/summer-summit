<script lang="ts">
	import type { Snippet } from 'svelte';

	import { buttonColors } from '$lib/tokens';

	type ButtonAppearance = 'primary' | 'secondary' | 'dark' | 'light';

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
	class="underline-button-surface text-base leading-6 tracking-normal font-body font-semibold flex pointer-events-none whitespace-nowrap uppercase transition-colors duration-100 ease-out [color:var(--underline-button-content)] items-center inset-0 justify-center absolute motion-reduce:duration-0"
	style:clip-path={clipPath}
	style:--underline-button-content={colors.content}
	style:--underline-button-disabled-content={colors.disabledContent}
	style:--underline-button-hover-content={colors.hoverContent}
>
	<span class="underline-button-content inline-flex gap-2 items-center justify-center relative">
		{@render children?.()}
		{@render icon?.()}
		<span
			aria-hidden="true"
			class="underline-button-decoration underline-button-dots h-0.5 transition-opacity duration-140 ease-out inset-x-0 bottom--0.5 absolute motion-reduce:duration-0"
		></span>
		<span
			aria-hidden="true"
			class="underline-button-decoration underline-button-line bg-current h-0.5 origin-left transition-transform duration-180 ease-out [transform:scaleX(0)] inset-x-0 bottom--0.5 absolute motion-reduce:duration-0"
		></span>
	</span>
</span>

<style>
	.underline-button-dots {
		background: repeating-linear-gradient(
			to right,
			currentColor 0 0.125rem,
			transparent 0.125rem 0.3125rem
		);
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
</style>
