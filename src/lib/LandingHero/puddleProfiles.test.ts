import { describe, expect, it } from 'vitest';

import { PUDDLE_DEFAULTS } from '../Puddle/config';
import { LANDING_PUDDLE_PROFILES } from './puddleProfiles';

describe('landing Puddle profiles', () => {
	it('preserves the Puddle defaults at the largest breakpoint', () => {
		expect(LANDING_PUDDLE_PROFILES.large).toEqual({
			bowlWidth: PUDDLE_DEFAULTS.bowlWidth,
			bowlHeight: PUDDLE_DEFAULTS.bowlHeight,
			level: PUDDLE_DEFAULTS.level,
			threshold: PUDDLE_DEFAULTS.threshold,
			cellSize: PUDDLE_DEFAULTS.cellSize,
		});
	});

	it('uses progressively coarser cells and broader bowls as space increases', () => {
		const transitions = [
			[LANDING_PUDDLE_PROFILES.compact, LANDING_PUDDLE_PROFILES.medium],
			[LANDING_PUDDLE_PROFILES.medium, LANDING_PUDDLE_PROFILES.expanded],
			[LANDING_PUDDLE_PROFILES.expanded, LANDING_PUDDLE_PROFILES.large],
		] as const;

		for (const [previous, current] of transitions) {
			expect(current.cellSize).toBeGreaterThan(previous.cellSize);
			expect(current.bowlWidth).toBeGreaterThan(previous.bowlWidth);
			expect(current.bowlHeight).toBeGreaterThanOrEqual(previous.bowlHeight);
			expect(current.level).toBeGreaterThan(previous.level);
			expect(current.threshold).toBeLessThan(previous.threshold);
		}
	});
});
