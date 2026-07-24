import type {
	Role,
	Seconds,
	SubstepSeconds,
	TexelCoordinate,
	TexelDistance,
	WorldUnits,
} from './brands';
import type { Params } from './params';
import type { Rng } from './rng';

export interface Grid {
	readonly nx: number;
	readonly ny: number;
}

/** Cell-centered field (height / scale / terrain), length nx*ny row-major. */
export interface ScalarField {
	readonly nx: number;
	readonly ny: number;
	readonly data: Float32Array;
}

/** MAC-staggered flux: fx on vertical faces ((nx+1)*ny), fy on horizontal (nx*(ny+1)). */
export interface FluxField {
	readonly nx: number;
	readonly ny: number;
	readonly fx: Float32Array;
	readonly fy: Float32Array;
}

export type ScalarRole = 'height' | 'scale' | 'terrain';

/** Gravity split into normal acceleration (`perp`) and in-plane acceleration (`tiltX`, `tiltY`). */
export interface GravitySample {
	readonly perp: number;
	readonly tiltX: number;
	readonly tiltY: number;
}

/**
 * A pass kernel's view of the world: current-copy reads by role (plus the
 * pre-swap copy via `readPrevScalar`), and the ping-pong target for whatever
 * this pass writes. The kernel never sees raw buffers or generations — the
 * executor resolves everything.
 */
export interface PassCtx {
	readonly grid: Grid;
	readonly dt: SubstepSeconds;
	readonly params: Params;
	readonly gravity: GravitySample;
	readonly readScalar: (role: ScalarRole) => ScalarField;
	/** The role's value before its last swap (e.g. pre-height-update depth). */
	readonly readPrevScalar: (role: ScalarRole) => ScalarField;
	readonly readFlux: () => FluxField;
	readonly writeScalar: () => ScalarField;
	readonly writeFlux: () => FluxField;
}

export type PassKind = 'flux_update' | 'outflow_scale' | 'height_update' | 'momentum';

export interface PassDesc {
	readonly kind: PassKind;
	readonly reads: readonly Role[];
	readonly writes: Role;
}

export interface StateStats {
	readonly mass: number;
	readonly maxDepth: WorldUnits;
}

export interface Integrator {
	readonly id: 'pipes' | 'pipes+momentum' | (string & {});
	readonly passes: readonly PassDesc[];
	readonly maxStableDt: (stats: StateStats, params: Params) => SubstepSeconds;
}

export type SourceCommand =
	| {
			readonly kind: 'splat';
			readonly x: TexelCoordinate;
			readonly y: TexelCoordinate;
			readonly amount: WorldUnits;
			readonly radius: TexelDistance;
	  }
	| { readonly kind: 'rain'; readonly amount: WorldUnits }
	| { readonly kind: 'fill'; readonly level: WorldUnits }
	| { readonly kind: 'wipe' };

export interface EmitCtx {
	readonly grid: Grid;
	readonly time: Seconds;
	readonly dt: Seconds;
	readonly rng: Rng;
}
export type SourceEmitter = (context: EmitCtx) => readonly SourceCommand[];

export interface SubstepPlan {
	readonly substeps: number;
	readonly dt: SubstepSeconds;
}

export interface GovernorInput {
	readonly frameDt: Seconds;
	readonly stats: StateStats;
	readonly integrator: Integrator;
	readonly params: Params;
}
export type GovernorPolicy = (input: GovernorInput) => SubstepPlan;

/** Serializable so a noise-phase driver can participate in snapshots. */
export interface GravityDriver {
	readonly sample: (time: Seconds) => GravitySample;
	readonly serialize: () => unknown;
}

export interface FrameStats {
	readonly mass: number;
	readonly maxDepth: WorldUnits;
	readonly substeps: number;
}
