import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

import type { Color } from 'culori';

import type { IntegratorId } from './waterSim';

// Omit the deprecated HTML `color` attribute; intersecting with it would
// collapse the prop type to `string` and reject culori Color objects.
export type PuddleProps = Omit<HTMLAttributes<HTMLDivElement>, 'color'> & {
	/** Puddle fill color. Any CSS color string or culori Color. */
	color?: string | Color;
	/** Display size of one grid cell, in CSS px. Bigger = chunkier blocks. */
	cellSize?: number;
	/** Depth above which a cell is painted. */
	threshold?: number;
	/** Resting water level; higher fills more of the bowl (bigger puddle). */
	level?: number;
	/** Terrain seed; changes the organic edge shape. */
	seed?: number;
	/** Low-frequency edge roughness. */
	noiseAmp?: number;
	/** Ripple with raindrops instead of holding the settled shape. Ignored under prefers-reduced-motion. */
	animated?: boolean;
	/** Gently tilt gravity toward the pointer so the water leans after the cursor. Needs `animated`; ignored under prefers-reduced-motion. */
	followCursor?: boolean;
	/** Simulation pipeline: pipe core, or the momentum second implementation. */
	integrator?: IntegratorId;
	/** Momentum-only: grid-scale oscillation damping (0 = off, 1 = full). Applies to `integrator="pipes+momentum"`. */
	momentumSmoothing?: number;
	/** Momentum-only: how much carried momentum survives each substep (1 = lossless, lower = calmer). Applies to `integrator="pipes+momentum"`. */
	momentumRetention?: number;
	/** Animation speed: sim-seconds advanced per real-second. Needs `animated`. */
	timeScale?: number;
	/** Target physics substep size (sim-seconds); smaller = more accurate, costlier. */
	baseSubstep?: number;
	/** Per-frame substep ceiling (spiral-of-death guard). Needs `animated`. */
	maxSubsteps?: number;
	/** Gravity-wave CFL safety margin (0–1); higher is faster but risks instability. */
	cflSafety?: number;
	/** Depth floor in the CFL estimate. */
	minWaveDepth?: number;
	/** Sub-steps run to settle poured water before the first paint. */
	settleSubsteps?: number;
	/** Drift the puddle's lean with noise so it gently sloshes direction. Needs `animated`. */
	gravityDrift?: boolean;
	/** Noise-drift magnitude (only with `gravityDrift`). */
	driftAmp?: number;
	/** Noise-drift rate in Hz (only with `gravityDrift`). */
	driftRateHz?: number;
	/** Raindrop cadence in sim-seconds (only when `animated`). */
	rainInterval?: number;
	/** Depth each raindrop adds (only when `animated`). */
	rainAmount?: number;
	/** Raindrop radius in cells (only when `animated`). */
	rainRadius?: number;
	/** Resolution guardrail: max grid cells per axis. */
	maxCells?: number;
	/** Cursor-follow tilt strength (only with `followCursor`). */
	cursorTilt?: number;
	/** Cursor-follow easing time-constant in seconds (only with `followCursor`). */
	cursorEase?: number;
	/** Lean with device motion sensors after permission is requested. Needs `animated`; ignored under prefers-reduced-motion. */
	deviceGravity?: boolean;
	/** Maximum device-driven in-plane gravity. */
	deviceTilt?: number;
	/** Device-gravity easing time-constant in seconds. */
	deviceEase?: number;
	/** Trailing window averaged as the neutral device orientation, in seconds. Zero disables neutralization. */
	deviceNeutralWindow?: number;
	children?: Snippet;
};

type PuddleDefaultKey =
	| 'color'
	| 'cellSize'
	| 'threshold'
	| 'level'
	| 'seed'
	| 'noiseAmp'
	| 'animated'
	| 'followCursor'
	| 'integrator'
	| 'momentumSmoothing'
	| 'momentumRetention'
	| 'timeScale'
	| 'baseSubstep'
	| 'maxSubsteps'
	| 'cflSafety'
	| 'minWaveDepth'
	| 'settleSubsteps'
	| 'gravityDrift'
	| 'driftAmp'
	| 'driftRateHz'
	| 'rainInterval'
	| 'rainAmount'
	| 'rainRadius'
	| 'maxCells'
	| 'cursorTilt'
	| 'cursorEase'
	| 'deviceGravity'
	| 'deviceTilt'
	| 'deviceEase'
	| 'deviceNeutralWindow';

/** Default values for every Puddle-specific prop. Spread into stories to match the component. */
export const PUDDLE_DEFAULTS = {
	color: '#141414',
	cellSize: 19,
	threshold: 0.035,
	level: 0.42,
	seed: 7,
	noiseAmp: 0.4,
	animated: false,
	followCursor: false,
	integrator: 'pipes+momentum',
	momentumSmoothing: 0.1,
	momentumRetention: 0.98,
	timeScale: 6,
	baseSubstep: 0.08,
	maxSubsteps: 8,
	cflSafety: 0.9,
	minWaveDepth: 0.001,
	settleSubsteps: 90,
	gravityDrift: true,
	driftAmp: 1,
	driftRateHz: 0.05,
	rainInterval: 0.6,
	rainAmount: 0.06,
	rainRadius: 1.5,
	maxCells: 200,
	cursorTilt: 1.7,
	cursorEase: 0.2,
	deviceGravity: false,
	deviceTilt: 6,
	deviceEase: 0.18,
	deviceNeutralWindow: 2,
} as const satisfies Required<Pick<PuddleProps, PuddleDefaultKey>>;
