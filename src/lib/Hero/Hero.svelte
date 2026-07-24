<script module lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import type { PuddleProps } from '../Puddle/config';

	export type HeroProps = PuddleProps & HTMLAttributes<HTMLDivElement>;
</script>

<script lang="ts">
	import { brandColorValues } from '$lib/tokens';

	import ErodedCheckerboard from '../ErodedCheckerboard/ErodedCheckerboard.svelte';
	import Puddle from '../Puddle/Puddle.svelte';

	let { class: className, children, ...puddleProps }: HeroProps = $props();
</script>

<div
	class={['text-[var(--hero-text-color)] bg-[var(--hero-background-color)] relative', className]}
	style:--hero-background-color={brandColorValues.primary['100']}
	style:--hero-puddle-text-color={brandColorValues.shade['50']}
	style:--hero-text-color={brandColorValues.secondary['500']}
>
	<Puddle {...puddleProps} class="h-full w-full inset-0 absolute">
		<ErodedCheckerboard class="h-full w-full inset-0 absolute" />
		<div class="inset-0 absolute">
			{@render children?.()}
		</div>
		<div
			aria-hidden="true"
			class="text-[var(--hero-puddle-text-color)] [clip-path:var(--puddle-clip)] inset-0 absolute"
		>
			{@render children?.()}
		</div>
	</Puddle>
</div>
