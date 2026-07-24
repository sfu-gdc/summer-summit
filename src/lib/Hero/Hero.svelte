<script module lang="ts">
	import type { PuddleProps } from '../Puddle/config';

	export type HeroProps = PuddleProps & {
		backgroundColor?: string;
		puddleTextColor?: string;
		textColor?: string;
	};
</script>

<script lang="ts">
	import { brandColorValues } from '$lib/tokens';

	import ErodedCheckerboard from '../ErodedCheckerboard/ErodedCheckerboard.svelte';
	import Puddle from '../Puddle/Puddle.svelte';

	let {
		backgroundColor = brandColorValues.primary['100'],
		puddleTextColor = brandColorValues.shade['50'],
		textColor = brandColorValues.secondary['500'],
		...puddleProps
	}: HeroProps = $props();
</script>

<div
	class="text-[var(--hero-text-color)] bg-[var(--hero-background-color)]"
	style:--hero-background-color={backgroundColor}
	style:--hero-puddle-text-color={puddleTextColor}
	style:--hero-text-color={textColor}
>
	<Puddle {...puddleProps}>
		<ErodedCheckerboard />
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
