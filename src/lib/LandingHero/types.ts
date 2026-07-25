export interface LandingHeroNavItem {
	label: string;
	href: string;
}

export interface LandingHeroProps {
	titleLines: readonly [string, string];
	dateLabel: string;
	organizerLabel: string;
	locationLabel: string;
	navItems?: readonly LandingHeroNavItem[];
	cta?:
		| {
				label: string;
				href?: string;
		  }
		| undefined;
	class?: string;
}
