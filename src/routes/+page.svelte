<script lang="ts">
	import { LandingHero, Head } from '$lib';
	import { usePageTransition } from '$lib/PageTransition/pageTransition.svelte';

	const pageTransition = usePageTransition();
</script>

<Head />

<LandingHero
	titleLines={['SUMMER SUMMIT', 'GAME JAM 2026']}
	dateLabel="SEPTEMBER 4–6"
	onPuddleTransitionTarget={pageTransition?.registerHomeTarget}
	actions={{
		discord: {
			label: 'JOIN THE DISCORD',
			href: 'https://discord.gg/jmZ8jmWHBx',
		},
		tickets: {
			label: 'GET YOUR TICKET',
			href: 'https://www.eventbrite.ca/e/summer-summit-game-jam-2026-tickets-1994789136004',
		},
	}}
/>
