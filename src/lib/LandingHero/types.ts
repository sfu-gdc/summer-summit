export interface LandingHeroNavItem {
	label: string;
	href: string;
}

export interface LandingHeroAction {
	label: string;
	href: string;
}

export interface LandingHeroActions {
	discord: LandingHeroAction;
	tickets: LandingHeroAction;
}

export interface LandingHeroProps {
	titleLines: readonly [string, string];
	dateLabel: string;
	organizerLabel: string;
	locationLabel: string;
	navItems?: readonly LandingHeroNavItem[];
	actions?: LandingHeroActions | undefined;
	class?: string;
}
