import { texelDistance, worldUnits } from '../brands';
import { rainEmitter } from '../emitters';
import { createEngine, type EngineConfig } from '../engine';
import { DEFAULT_MAX_SUBSTEPS, defaultGovernor, makeGovernor } from '../governor';
import { constantGravity, noiseGravity, offsetGravity } from '../gravity';
import { integrators } from '../integrators';
import { resolveParams } from '../params';
import { makeTerrain } from '../terrain';
import type { Grid, SourceEmitter } from '../types';
import { SIM_DEFAULTS } from './defaults';
import {
	clampDimension,
	finiteOrFallback,
	MAX_DIM,
	MIN_DIM,
	nonnegativeIntegerOrZero,
	type WaterSimOptions,
} from './options';

export interface WaterSimConfig {
	readonly grid: Grid;
	readonly engine: EngineConfig;
}

export function createWaterSimConfig(
	options: WaterSimOptions,
	tiltOffset: Readonly<{ x: number; y: number }>,
): WaterSimConfig {
	const minDim = Math.max(1, Math.floor(finiteOrFallback(options.minDim, MIN_DIM)));
	const maxDim = Math.max(minDim, Math.floor(finiteOrFallback(options.maxDim, MAX_DIM)));
	const grid: Grid = {
		nx: clampDimension(options.nx, minDim, maxDim),
		ny: clampDimension(options.ny, minDim, maxDim),
	};
	const seed = finiteOrFallback(options.seed, 7);
	const params = resolveParams({ ...SIM_DEFAULTS, ...options });
	const terrain = makeTerrain(grid, params, seed);
	const integrator = integrators[options.integrator ?? SIM_DEFAULTS.integrator];
	const baseGravity =
		(options.gravityDrift ?? SIM_DEFAULTS.gravityDrift)
			? noiseGravity({
					perp: params.gravity,
					seed,
					amp: finiteOrFallback(options.driftAmp, SIM_DEFAULTS.driftAmp),
					rateHz: options.driftRateHz,
				})
			: constantGravity(params.gravity, params.tiltX, params.tiltY);
	const gravity = offsetGravity(baseGravity, () => tiltOffset);

	const rainOptions = typeof options.rain === 'object' ? options.rain : {};
	const emitters: SourceEmitter[] =
		options.rain === true || typeof options.rain === 'object'
			? [
					rainEmitter({
						intervalSec: finiteOrFallback(rainOptions.intervalSec, 0.6),
						amount: worldUnits(finiteOrFallback(rainOptions.amount, 0.06)),
						radius: texelDistance(finiteOrFallback(rainOptions.radius, 1.5)),
					}),
				]
			: [];

	// Keep governor and engine caps aligned.
	const maxSubsteps = finiteOrFallback(options.maxSubsteps, DEFAULT_MAX_SUBSTEPS);
	const substepCap = nonnegativeIntegerOrZero(maxSubsteps);
	const governor = options.maxSubsteps !== undefined ? makeGovernor(substepCap) : defaultGovernor;

	return {
		grid,
		engine: {
			grid,
			terrain,
			initialHeight: (xIndex, yIndex) =>
				worldUnits(Math.max(0, params.level - (terrain[yIndex * grid.nx + xIndex] ?? 0))),
			params,
			seed,
			integrator,
			gravity,
			emitters,
			governor,
			maxSubsteps: substepCap,
		},
	};
}

export function createConfiguredEngine(config: WaterSimConfig) {
	return createEngine(config.engine);
}
