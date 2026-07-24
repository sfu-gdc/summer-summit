// `advance` uses a capped time accumulator so simulation speed is display
// refresh-rate independent and backgrounded frames cannot create unbounded work.

import { seconds, substepSeconds, type WorldUnits } from './brands';
import { applyCommand } from './emitters';
import { runSubstep } from './executor';
import { DEFAULT_MAX_SUBSTEPS, maxFrameBudget } from './governor';
import type { Params } from './params';
import { createResources, type Resources } from './resources';
import { createRng, type Rng } from './rng';
import type {
	FrameStats,
	GovernorPolicy,
	GravityDriver,
	Grid,
	Integrator,
	SourceCommand,
	SourceEmitter,
	StateStats,
} from './types';

export interface EngineConfig {
	readonly grid: Grid;
	readonly terrain: Float32Array;
	readonly initialHeight: (xIndex: number, yIndex: number) => WorldUnits;
	readonly params: Params;
	readonly seed: number;
	readonly integrator: Integrator;
	readonly gravity: GravityDriver;
	readonly emitters: readonly SourceEmitter[];
	readonly governor: GovernorPolicy;
	/** Per-frame substep cap; defaults to `DEFAULT_MAX_SUBSTEPS` and must match the governor. */
	readonly maxSubsteps?: number | undefined;
}

function scaleInPlace(values: Float32Array, scale: number): void {
	values.set(values.map((value) => value * scale));
}

export class Engine {
	readonly grid: Grid;

	private readonly initialHeight: EngineConfig['initialHeight'];
	private readonly params: Params;
	private readonly seed: number;
	private readonly integrator: Integrator;
	private readonly gravity: GravityDriver;
	private readonly emitters: readonly SourceEmitter[];
	private readonly governor: GovernorPolicy;
	private readonly maxSubsteps: number;
	private readonly resources: Resources;
	private rng: Rng;

	private simClock = 0; // sim-seconds integrated
	private accumulatedTime = 0; // unspent sim-time budget
	private emittedUpTo = 0; // sim-time sources are emitted through (leads simClock by <= accumulatedTime)

	constructor(config: EngineConfig) {
		this.grid = config.grid;
		this.initialHeight = config.initialHeight;
		this.params = config.params;
		this.seed = config.seed;
		this.integrator = config.integrator;
		this.gravity = config.gravity;
		this.emitters = config.emitters;
		this.governor = config.governor;
		this.maxSubsteps = config.maxSubsteps ?? DEFAULT_MAX_SUBSTEPS;
		this.resources = createResources(config.grid, config.terrain);
		this.rng = createRng(config.seed);
		this.resources.reset(config.initialHeight);
	}

	// Emit across a sim-time window before planning so new depth affects the CFL bound.
	private runEmitters(startTime: number, duration: number): void {
		if (this.emitters.length === 0 || duration <= 0) return;
		const context = {
			grid: this.grid,
			time: seconds(startTime),
			dt: seconds(duration),
			rng: this.rng,
		};
		const commands = this.emitters.flatMap((emitter) => emitter(context));
		for (const command of commands) applyCommand(this.resources, command);
	}

	/** Live ping-pong buffer; callers must not cache or write it. */
	height(): ArrayLike<number> {
		return this.resources.height().data;
	}

	totalMass(): number {
		return this.resources.stats().mass;
	}

	stats(): StateStats {
		return this.resources.stats();
	}

	advance(realDtSeconds: number): FrameStats {
		const elapsedTime = Number.isFinite(realDtSeconds) ? Math.max(0, realDtSeconds) : 0;
		this.accumulatedTime += elapsedTime * this.params.timeScale;
		const frameBudget = maxFrameBudget(this.maxSubsteps, this.params.baseSubstep);
		if (this.accumulatedTime > frameBudget) this.accumulatedTime = frameBudget; // Prevent a long frame from creating a runaway backlog.
		// Emit over the full horizon so accumulator remainders are not emitted twice.
		const horizon = this.simClock + this.accumulatedTime;
		if (horizon > this.emittedUpTo) {
			this.runEmitters(this.emittedUpTo, horizon - this.emittedUpTo);
			this.emittedUpTo = horizon;
		}
		const plan = this.governor({
			frameDt: seconds(this.accumulatedTime),
			stats: this.resources.stats(),
			integrator: this.integrator,
			params: this.params,
		});
		let completedSubsteps = 0;
		for (let substepIndex = 0; substepIndex < plan.substeps; substepIndex++) {
			runSubstep(
				this.resources,
				this.integrator,
				plan.dt,
				this.params,
				this.gravity.sample(seconds(this.simClock)),
			);
			this.simClock += plan.dt;
			completedSubsteps++;
		}
		this.accumulatedTime = Math.max(0, this.accumulatedTime - completedSubsteps * plan.dt);
		const { mass, maxDepth } = this.resources.stats();
		return {
			mass,
			maxDepth,
			substeps: completedSubsteps,
		};
	}

	settle(substeps: number): void {
		const gravitySample = this.gravity.sample(seconds(0));
		const dt = substepSeconds(
			Math.min(
				this.params.baseSubstep,
				this.integrator.maxStableDt(this.resources.stats(), this.params),
			),
		);
		for (let substepIndex = 0; substepIndex < substeps; substepIndex++) {
			runSubstep(this.resources, this.integrator, dt, this.params, gravitySample);
		}
	}

	step(dt: number): void {
		runSubstep(
			this.resources,
			this.integrator,
			substepSeconds(dt),
			this.params,
			this.gravity.sample(seconds(0)),
		);
	}

	emit(command: SourceCommand): void {
		applyCommand(this.resources, command);
	}

	clampMass(targetMass: number, knownStats?: Pick<StateStats, 'mass'>): void {
		const knownMass = knownStats?.mass;
		const currentMass =
			knownMass !== undefined && Number.isFinite(knownMass) && knownMass >= 0
				? knownMass
				: this.resources.stats().mass;
		if (currentMass <= targetMass || currentMass === 0) return;
		const massScale = targetMass / currentMass;
		this.resources.applyToHeight((heightData) => {
			scaleInPlace(heightData, massScale);
		});
		// Scale flux too, preserving velocity while reducing volume.
		this.resources.applyToFlux((flux) => {
			scaleInPlace(flux.fx, massScale);
			scaleInPlace(flux.fy, massScale);
		});
	}

	reset(): void {
		this.resources.reset(this.initialHeight);
		this.rng = createRng(this.seed);
		this.simClock = 0;
		this.accumulatedTime = 0;
		this.emittedUpTo = 0;
	}
}

export function createEngine(config: EngineConfig): Engine {
	return new Engine(config);
}
