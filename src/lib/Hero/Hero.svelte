<script module lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	import type { PuddleProps } from '../Puddle/config';

	export type HeroProps = PuddleProps & {
		class?: HTMLAttributes<HTMLDivElement>['class'];
	};
</script>

<script lang="ts">
	import { brandColorValues } from '$lib/tokens';

	import ErodedCheckerboard from '../ErodedCheckerboard/ErodedCheckerboard.svelte';
	import Puddle from '../Puddle/Puddle.svelte';

	let { class: className, ...puddleProps }: HeroProps = $props();
</script>

<div
	class={['text-[var(--hero-text-color)] bg-[var(--hero-background-color)] relative', className]}
	style:--hero-background-color={brandColorValues.primary['100']}
	style:--hero-puddle-text-color={brandColorValues.shade['50']}
	style:--hero-text-color={brandColorValues.secondary['500']}
>
	<Puddle {...puddleProps} class="h-full w-full inset-0 absolute">
		<ErodedCheckerboard class="h-full w-full inset-0 absolute" />
		<div class="p-10 grid inset-0 place-items-center absolute">
			<span class="text-6xl leading-[1.1] tracking-[0.04em] font-header text-center"
				>SUMMER SUMMIT<br />GAME JAM 2026</span
			>
		</div>
		<div
			aria-hidden="true"
			class="text-[var(--hero-puddle-text-color)] p-10 grid [clip-path:var(--puddle-clip)] inset-0 place-items-center absolute"
		>
			<span class="text-6xl leading-[1.1] tracking-[0.04em] font-header text-center"
				>SUMMER SUMMIT<br />GAME JAM 2026</span
			>
		</div>
	</Puddle>
</div>
