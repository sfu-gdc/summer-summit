<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet | undefined;
	}

	const { children }: Props = $props();
</script>

<div class="text-9xl text-brand-shade-900 font-700 font-hero flex flex-col flex-nowrap lowercase">
	summer<br />summit
	<div class="flex flex-nowrap gap-xl">
		game{@render children?.()}
	</div>
	jam 2026
</div>
