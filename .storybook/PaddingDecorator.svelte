<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet | undefined;
	}

	let { children }: Props = $props();
</script>

<div>
	{@render children?.()}
</div>

<style>
	div {
		padding: 16px;
	}
</style>
