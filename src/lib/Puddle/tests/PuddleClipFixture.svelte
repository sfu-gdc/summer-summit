<script lang="ts">
	import Puddle from '../Puddle.svelte';

	let { responsiveSnapshots = false }: { responsiveSnapshots?: boolean } = $props();
</script>

{#snippet clippedContent()}
	<div class="size-full" data-puddle-clipped-probe></div>
{/snippet}

<Puddle
	animated={false}
	{responsiveSnapshots}
	clippedChildren={clippedContent}
	data-testid="puddle-clip-fixture"
	style="width:400px;height:800px;"
>
	<div class="size-full inset-0 absolute" data-puddle-base-probe></div>
</Puddle>
