import type { PuddleProps } from '../Puddle/config';
import { PUDDLE_DEFAULTS } from '../Puddle/config';

export type LandingPuddleProfileName = 'compact' | 'medium' | 'expanded' | 'large';

export type LandingPuddleProfile = Required<
	Pick<PuddleProps, 'bowlWidth' | 'bowlHeight' | 'level' | 'threshold' | 'cellSize'>
>;

export const LANDING_PUDDLE_PROFILES = {
	compact: {
		bowlWidth: 650,
		bowlHeight: 300,
		level: 0.4,
		threshold: 0.05,
		cellSize: 18,
	},
	medium: {
		bowlWidth: 700,
		bowlHeight: 320,
		level: 0.405,
		threshold: 0.045,
		cellSize: 26,
	},
	expanded: {
		bowlWidth: 760,
		bowlHeight: 360,
		level: PUDDLE_DEFAULTS.level,
		threshold: PUDDLE_DEFAULTS.threshold,
		cellSize: PUDDLE_DEFAULTS.cellSize,
	},
	large: {
		bowlWidth: PUDDLE_DEFAULTS.bowlWidth,
		bowlHeight: PUDDLE_DEFAULTS.bowlHeight,
		level: PUDDLE_DEFAULTS.level,
		threshold: PUDDLE_DEFAULTS.threshold,
		cellSize: PUDDLE_DEFAULTS.cellSize,
	},
} as const satisfies Record<LandingPuddleProfileName, LandingPuddleProfile>;
