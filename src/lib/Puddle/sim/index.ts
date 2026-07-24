export { createWaterSim, DEFAULT_SETTLE_SUBSTEPS, SIM_DEFAULTS, WaterSim } from './facade';
export type { WaterSimOptions } from './facade';

export { integrators } from './integrators';
export type { IntegratorId } from './integrators';
export { params as paramSchema, resolveParams } from './params';
export type { ParamKey, ParamOverrides, Params } from './params';
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
	GravityDriver,
	GravitySample,
	Grid,
	Integrator,
	SourceCommand,
	SourceEmitter,
	StateStats,
	SubstepPlan,
} from './types';
