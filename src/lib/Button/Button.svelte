<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import { Button, type ButtonRootProps } from 'bits-ui';

	import SprayBorder from '../SprayBorder/SprayBorder.svelte';

	type Props = ButtonRootProps & {
		/** Optional icon rendered before the label. */
		icon?: Snippet;
		/** Swap the solid fill for a WebGL spray-paint border. `true` for defaults, or tune it. */
		spray?: boolean | ComponentProps<typeof SprayBorder>;
	};

	let { icon, children, class: className, spray = false, ...restProps }: Props = $props();

	const sprayOpts = $derived(spray === true ? {} : spray || null);
</script>

<Button.Root
	class={[
		'text-white tracking-wider font-bold font-sans px-5 outline-4 outline-brand-shade-800 outline-offset--4 inline-flex gap-2 h-14 cursor-pointer select-none whitespace-nowrap uppercase transition-all duration-100 transition-ease-out items-center justify-center disabled:text-brand-shade-300 disabled:bg-brand-shade-700 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:not-disabled:outline-offset-4 hover:text-brand-secondary-50',
		sprayOpts ? 'relative isolate bg-transparent' : 'bg-brand-shade-800',
		className,
	]}
	{...restProps}
>
	{#if sprayOpts}
		<SprayBorder {...sprayOpts} />
		<span class="inline-flex gap-2 items-center relative z-10">
			{@render icon?.()}
			{@render children?.()}
		</span>
	{:else}
		{@render icon?.()}
		{@render children?.()}
	{/if}
</Button.Root>
