export interface LandingHeroStoryArgs {
	readonly titleLines: readonly [string, string];
	readonly dateLabel: string;
	readonly organizerLabel: string;
	readonly locationLabel: string;
	readonly navItems?: readonly { label: string; href: string }[];
	readonly cta?: { label: string; href?: string } | undefined;
	readonly class?: string;
}

export const LANDING_HERO_EVENT_ARGS = {
	titleLines: ['SUMMER SUMMIT', 'GAME JAM 2026'],
	dateLabel: 'SEPT 4 - 6',
	organizerLabel: 'GAME DEV CLUB X IATSU 2026',
	locationLabel: 'SFU BURNABY CAMPUS',
	navItems: [],
	cta: { label: 'Join the jam', href: '/join' },
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
		args: { ...LANDING_HERO_EVENT_ARGS, cta: undefined },
	},
	reducedMotion: {
		name: 'Reduced Motion',
		screenshotName: 'reduced-motion',
		viewport: 'expanded',
		args: LANDING_HERO_EVENT_ARGS,
	},
} as const satisfies Record<string, LandingHeroStoryCase>;

export const LANDING_HERO_VISUAL_CASES = Object.values(LANDING_HERO_STORY_CASES);
