import { texelCoordinate, texelDistance, worldUnits } from './brands';
import { rainEmitter } from './emitters';
import { createEngine } from './engine';
import { DEFAULT_MAX_SUBSTEPS, defaultGovernor, makeGovernor } from './governor';
import { constantGravity, noiseGravity, offsetGravity } from './gravity';
import { integrators, type IntegratorId } from './integrators';
import { type ParamOverrides, params as paramSchema, resolveParams } from './params';
import { makeTerrain } from './terrain';
import type { FrameStats, Grid, SourceEmitter } from './types';

export const DEFAULT_SETTLE_SUBSTEPS = 90;
export const PUDDLE_DEFAULTS = {
	cellSize: 19,
	threshold: 0.035,
	level: 0.42,
	integrator: 'pipes+momentum',
	momentumSmoothing: 0,
	momentumRetention: 0.98,
	gravityDrift: true,
	driftAmp: 1,
	cursorTilt: 1.7,
	cursorEase: 0.2,
} as const;
const MIN_DIM = 4;
const MAX_DIM = 512;
const MAX_TILT = paramSchema.tiltX.max;

export interface WaterSimOptions extends ParamOverrides {
	nx: number;
	ny: number;
	seed?: number;
	/** `'pipes'` or the default momentum-enabled variant `'pipes+momentum'`. */
	integrator?: IntegratorId;
	/** Install a rain emitter (raindrop ripples) for animated use. */
	rain?: boolean | { intervalSec?: number; amount?: number; radius?: number };
	/** Drift the gravity tilt with noise instead of holding it constant. */
	gravityDrift?: boolean;
	/** Noise-drift tilt magnitude (only with `gravityDrift`). */
	driftAmp?: number;
	/** Noise-drift rate in Hz (only with `gravityDrift`). */
	driftRateHz?: number;
	/** Per-frame substep cap (spiral-of-death guard). */
	maxSubsteps?: number;
	/** Grid dimension floor the nx/ny inputs are clamped to. */
	minDim?: number;
	/** Grid dimension ceiling the nx/ny inputs are clamped to (guards against a giant grid). */
	maxDim?: number;
}

function clampDimension(dimension: number, minimum: number, maximum: number): number {
	return Number.isFinite(dimension)
		? Math.max(minimum, Math.min(maximum, Math.floor(dimension)))
		: minimum;
}

const finiteOrFallback = (value: number | undefined, fallback: number): number =>
	value !== undefined && Number.isFinite(value) ? value : fallback;

const nonnegativeIntegerOrZero = (value: number): number =>
	Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const clampTilt = (value: number): number => Math.max(-MAX_TILT, Math.min(MAX_TILT, value));

export class WaterSim {
	readonly nx: number;
	readonly ny: number;

	private readonly engine: ReturnType<typeof createEngine>;
	private readonly heightSnapshot: Float32Array;
	private readonly tiltOffset = { x: 0, y: 0 };

	constructor(options: WaterSimOptions) {
		const minDim = Math.max(1, Math.floor(finiteOrFallback(options.minDim, MIN_DIM)));
		const maxDim = Math.max(minDim, Math.floor(finiteOrFallback(options.maxDim, MAX_DIM)));
		const grid: Grid = {
			nx: clampDimension(options.nx, minDim, maxDim),
			ny: clampDimension(options.ny, minDim, maxDim),
		};
		const seed = finiteOrFallback(options.seed, 7);
		const params = resolveParams({ ...PUDDLE_DEFAULTS, ...options });
		const terrain = makeTerrain(grid, params, seed);
		const integrator = integrators[options.integrator ?? PUDDLE_DEFAULTS.integrator];

		const baseGravity =
			(options.gravityDrift ?? PUDDLE_DEFAULTS.gravityDrift)
				? noiseGravity({
						perp: params.gravity,
						seed,
						amp: finiteOrFallback(options.driftAmp, PUDDLE_DEFAULTS.driftAmp),
						rateHz: options.driftRateHz,
					})
				: constantGravity(params.gravity, params.tiltX, params.tiltY);
		const gravity = offsetGravity(baseGravity, () => this.tiltOffset);

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

		this.nx = grid.nx;
		this.ny = grid.ny;
		this.engine = createEngine({
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
		});

		// Hide the mutable, ping-pong engine buffer behind a reused snapshot.
		this.heightSnapshot = new Float32Array(grid.nx * grid.ny);
	}

	/**
	 * Current per-cell depth for rendering. This reused snapshot is overwritten on
	 * each access; copy it to retain a frame's values.
	 */
	get height(): Float32Array {
		this.heightSnapshot.set(this.engine.height());
		return this.heightSnapshot;
	}

	/** Run substeps to bring poured water to rest (deterministic). */
	settle(substeps = DEFAULT_SETTLE_SUBSTEPS): void {
		this.engine.settle(nonnegativeIntegerOrZero(substeps));
	}

	/** Advance by real elapsed seconds (framerate-independent). Returns this frame's stats. */
	advance(realDtSeconds: number): FrameStats {
		return this.engine.advance(realDtSeconds);
	}

	step(dt: number): void {
		if (Number.isFinite(dt)) this.engine.step(dt);
	}

	splat(x: number, y: number, amount: number, radius: number): void {
		if (![x, y, amount, radius].every(Number.isFinite)) return;
		this.engine.emit({
			kind: 'splat',
			x: texelCoordinate(x),
			y: texelCoordinate(y),
			amount: worldUnits(amount),
			radius: texelDistance(radius),
		});
	}

	/**
	 * In-plane gravity tilt added on top of the configured driver (pointer /
	 * device-orientation interaction). Same sign convention as the `tiltX`/`tiltY`
	 * params: a negative x offset drives flow toward +x. Clamped to the tilt range.
	 */
	setTiltOffset(x: number, y: number): void {
		if (![x, y].every(Number.isFinite)) return;
		this.tiltOffset.x = clampTilt(x);
		this.tiltOffset.y = clampTilt(y);
	}

	clampMass(target: number): void {
		if (Number.isFinite(target)) this.engine.clampMass(Math.max(0, target));
	}

	totalMass(): number {
		return this.engine.totalMass();
	}

	reset(): void {
		this.engine.reset();
	}
}

export function createWaterSim(options: WaterSimOptions): WaterSim {
	return new WaterSim(options);
}

export { integrators } from './integrators';
export type { IntegratorId } from './integrators';
export { params as paramSchema, resolveParams } from './params';
export type { Params, ParamKey, ParamOverrides } from './params';
export type { Integrator, SourceCommand, SourceEmitter, GravityDriver } from './types';

export { Engine, createEngine } from './engine';
export type { EngineConfig } from './engine';
export { constantGravity, noiseGravity, offsetGravity } from './gravity';
export { DEFAULT_MAX_SUBSTEPS, defaultGovernor, makeGovernor } from './governor';
export { rainEmitter } from './emitters';
export { makeTerrain } from './terrain';
export {
	domainCoordinate,
	seconds,
	substepSeconds,
	texelCoordinate,
	texelDistance,
	worldUnits,
} from './brands';
export type {
	DomainCoordinate,
	Seconds,
	SubstepSeconds,
	TexelCoordinate,
	TexelDistance,
	WorldUnits,
} from './brands';
export type { Rng } from './rng';
export type {
	EmitCtx,
	FrameStats,
	GovernorInput,
	GovernorPolicy,
	GravitySample,
	Grid,
	StateStats,
	SubstepPlan,
} from './types';
