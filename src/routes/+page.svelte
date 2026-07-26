<script lang="ts">
	import { LandingHero } from '$lib';
</script>

<svelte:head>
	<title>Summer Summit Game Jam 2026</title>
	<meta
		name="description"
		content="Summer Summit Game Jam 2026 runs September 4–6 at SFU Burnaby Campus, presented by Game Dev Club and IATSU."
	/>
</svelte:head>

<LandingHero
	titleLines={['SUMMER SUMMIT', 'GAME JAM 2026']}
	dateLabel="SEPTEMBER 4–6"
	organizerLabel="GAME DEV CLUB X IATSU 2026"
	locationLabel="SFU BURNABY CAMPUS"
	navItems={[]}
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
