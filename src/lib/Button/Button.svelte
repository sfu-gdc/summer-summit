<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button, type ButtonRootProps } from 'bits-ui';

	type Props = ButtonRootProps & {
		/** Optional icon rendered before the label. */
		icon?: Snippet;
	};

	let { icon, children, class: className, ...restProps }: Props = $props();
</script>

<Button.Root
	class={[
		'text-white tracking-wider font-bold font-sans px-5 outline-4 outline-brand-shade-800 outline-offset--4 bg-brand-shade-800 inline-flex gap-2 h-14 cursor-pointer select-none whitespace-nowrap uppercase transition-all duration-100 transition-ease-out items-center justify-center disabled:text-brand-shade-300 disabled:bg-brand-shade-700 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:not-disabled:outline-offset-4 hover:text-brand-secondary-50',
		className,
	]}
	{...restProps}
>
	{@render icon?.()}
	{@render children?.()}
</Button.Root>
