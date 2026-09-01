export interface LandingHeroStoryArgs {
	readonly titleLines: readonly [string, string];
	readonly dateLabel: string;
	readonly actions?:
		| {
				discord: { label: string; href: string };
				tickets: { label: string; href: string };
		  }
		| undefined;
	readonly class?: string;
}

export const LANDING_HERO_EVENT_ARGS = {
	titleLines: ['SUMMER SUMMIT', 'GAME JAM 2026'],
	dateLabel: 'SEPTEMBER 4–6',
	actions: {
		discord: { label: 'Join the Discord', href: 'https://discord.gg/jmZ8jmWHBx' },
		tickets: {
			label: 'Get your ticket',
			href: 'https://www.eventbrite.ca/e/summer-summit-game-jam-2026-tickets-1994789136004',
		},
	},
} satisfies LandingHeroStoryArgs;

export const LANDING_HERO_VIEWPORTS = {
	compact: {
		name: 'Compact portrait',
		styles: { width: '390px', height: '844px' },
		type: 'mobile',
	},
	medium: {
		name: 'Medium',
		styles: { width: '768px', height: '1024px' },
		type: 'tablet',
	},
	expanded: {
		name: 'Expanded',
		styles: { width: '1280px', height: '800px' },
		type: 'desktop',
	},
	large: {
		name: 'Large desktop',
		styles: { width: '1920px', height: '1080px' },
		type: 'desktop',
	},
} as const;

type LandingHeroViewportName = keyof typeof LANDING_HERO_VIEWPORTS;

interface LandingHeroStoryCase {
	readonly name: string;
	readonly screenshotName: string;
	readonly viewport: LandingHeroViewportName;
	readonly args: LandingHeroStoryArgs;
}

export const LANDING_HERO_STORY_CASES = {
	compact: {
		name: 'Compact Portrait',
		screenshotName: 'compact-portrait',
		viewport: 'compact',
		args: LANDING_HERO_EVENT_ARGS,
	},
	medium: {
		name: 'Medium',
		screenshotName: 'medium',
		viewport: 'medium',
		args: LANDING_HERO_EVENT_ARGS,
	},
	expanded: {
		name: 'Expanded',
		screenshotName: 'expanded',
		viewport: 'expanded',
		args: LANDING_HERO_EVENT_ARGS,
	},
	large: {
		name: 'Large Desktop',
		screenshotName: 'large-desktop',
		viewport: 'large',
		args: LANDING_HERO_EVENT_ARGS,
	},
	withoutCta: {
		name: 'Without CTA',
		screenshotName: 'without-cta',
		viewport: 'expanded',
		args: { ...LANDING_HERO_EVENT_ARGS, actions: undefined },
	},
	reducedMotion: {
		name: 'Reduced Motion',
		screenshotName: 'reduced-motion',
		viewport: 'expanded',
		args: LANDING_HERO_EVENT_ARGS,
	},
} as const satisfies Record<string, LandingHeroStoryCase>;

export const LANDING_HERO_VISUAL_CASES = Object.values(LANDING_HERO_STORY_CASES);
