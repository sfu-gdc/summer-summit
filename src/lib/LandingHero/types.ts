import type { PuddleProps } from '../Puddle/config';

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
	actions?: LandingHeroActions | undefined;
	onPuddleTransitionTarget?: PuddleProps['onTransitionTarget'];
	class?: string;
}
