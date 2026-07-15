<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	import type { ButtonRootProps } from 'bits-ui';

	import { brandColors } from '$lib/tokens';

	import SprayBorder from '../SprayBorder/SprayBorder.svelte';

	type Props = ButtonRootProps & {
		/** Optional icon rendered before the label. */
		icon?: Snippet;
		/** Swap the solid fill for a WebGL spray-paint border. `true` for defaults, or tune it. */
		spray?: boolean | ComponentProps<typeof SprayBorder>;
	};

	let { icon, children, class: className, spray, ...restProps }: Props = $props();

	// `spray` is always on for now; an object still tunes the border's knobs.
	const sprayOpts = $derived(typeof spray === 'object' ? spray : {});
</script>

<!-- bits-ui Button.Root can't delegate its element, so SprayBorder *is* the native button/anchor. -->
<!-- Upcast collapses bits-ui's Anchor|Button union at the spread so it doesn't hit TS2590 (union too complex). -->
<SprayBorder
	{...sprayOpts}
	as={restProps.href != null ? 'a' : 'button'}
	{...restProps as HTMLAttributes<HTMLElement>}
	color={brandColors.shade[800]}
	class={[
		'text-white tracking-wider font-bold font-sans px-5 outline-4 outline-transparent outline-offset--4 inline-flex gap-2 h-14 cursor-pointer select-none whitespace-nowrap uppercase transition-all duration-100 transition-ease-out items-center justify-center disabled:text-brand-shade-300 disabled:bg-brand-shade-700 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:not-disabled:outline-brand-shade-800 focus-visible:not-disabled:outline-offset-4 hover:text-brand-secondary-50',
		'bg-transparent',
		className,
	]}
>
	<span class="inline-flex gap-2 items-center relative z-10">
		{@render icon?.()}
		{@render children?.()}
	</span>
</SprayBorder>
