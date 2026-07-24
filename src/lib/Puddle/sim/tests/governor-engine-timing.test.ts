import { describe, expect, it } from 'vitest';

import { createWaterSim } from '..';
import { seconds, worldUnits } from '../brands';
import { BASE_SUBSTEP, defaultGovernor } from '../governor';
import { integrators } from '../integrators';
import { resolveParams } from '../params';
import type { StateStats } from '../types';

describe('defaultGovernor', () => {
	const stats: StateStats = { mass: 100, maxDepth: worldUnits(0.6) };
	const params = resolveParams({});

	it('scales substeps with the frame budget and never exceeds CFL dt', () => {
		const smallFramePlan = defaultGovernor({
			frameDt: seconds(BASE_SUBSTEP),
			stats,
			integrator: integrators.pipes,
			params,
		});
		const largeFramePlan = defaultGovernor({
			frameDt: seconds(BASE_SUBSTEP * 5),
			stats,
			integrator: integrators.pipes,
			params,
		});
		expect(smallFramePlan.substeps).toBe(1);
		expect(largeFramePlan.substeps).toBeGreaterThan(smallFramePlan.substeps);
		expect(largeFramePlan.dt).toBeLessThanOrEqual(BASE_SUBSTEP + 1e-9);
	});

	it('caps substeps per frame (no spiral of death)', () => {
		const cappedPlan = defaultGovernor({
			frameDt: seconds(100),
			stats,
			integrator: integrators.pipes,
			params,
		});
		expect(cappedPlan.substeps).toBeLessThanOrEqual(8);
	});
});

describe('advance — framerate independence (governor accumulator)', () => {
	it('runs the same total substeps for the same real time regardless of frame size', () => {
		const totalSubsteps = (frameDt: number, frames: number) => {
			const sim = createWaterSim({ nx: 32, ny: 20, seed: 2 });
			sim.settle(30);
			let totalSubstepCount = 0;
			for (let frameIndex = 0; frameIndex < frames; frameIndex++)
				totalSubstepCount += sim.advance(frameDt).substeps;
			return totalSubstepCount;
		};
		const substepsAt30Fps = totalSubsteps(1 / 30, 60);
		const substepsAt60Fps = totalSubsteps(1 / 60, 120);
		const substepsAt120Fps = totalSubsteps(1 / 120, 240);
		// The floor accumulator carries the remainder, so total advanced sim-time
		// is the same (within one substep of quantization) at every frame rate.
		expect(Math.abs(substepsAt60Fps - substepsAt30Fps)).toBeLessThanOrEqual(2);
		expect(Math.abs(substepsAt60Fps - substepsAt120Fps)).toBeLessThanOrEqual(2);
		expect(substepsAt60Fps).toBeGreaterThanOrEqual(147);
		expect(substepsAt60Fps).toBeLessThanOrEqual(151);
	});

	it('caps per-frame substeps at the maxSubsteps override', () => {
		const sim = createWaterSim({ nx: 32, ny: 20, seed: 2, maxSubsteps: 1 });
		sim.settle(20);
		expect(sim.advance(10).substeps).toBeLessThanOrEqual(1);
		expect(Array.from(sim.height).every(Number.isFinite)).toBe(true);
	});
});
