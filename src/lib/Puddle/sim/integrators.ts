// Passes are swapped as whole pipelines because their state-layout contracts are
// not compiler-visible. Momentum extends the pipes pipeline with an optional appended pass.

import { type SubstepSeconds, substepSeconds } from './brands';
import type { Params } from './params';
import { PASSES } from './passes';
import type { Integrator, StateStats } from './types';

// Gravity-wave CFL: dt < dx / sqrt(g * hMax), dx = 1. `cflSafety` keeps a margin;
// `minWaveDepth` floors hMax so an empty domain doesn't yield an infinite dt.
function cflStableDt(stats: StateStats, params: Params): SubstepSeconds {
	const maxWaveDepth = Math.max(stats.maxDepth, params.minWaveDepth);
	return substepSeconds(params.cflSafety / Math.sqrt(params.gravity * maxWaveDepth));
}

export const pipes: Integrator = {
	id: 'pipes',
	passes: [PASSES.fluxUpdate, PASSES.outflowScale, PASSES.heightUpdate],
	maxStableDt: cflStableDt,
};

export const pipesMomentum: Integrator = {
	id: 'pipes+momentum',
	passes: [...pipes.passes, PASSES.momentum],
	maxStableDt: cflStableDt,
};

export const integrators = { pipes, 'pipes+momentum': pipesMomentum } as const;
export type IntegratorId = keyof typeof integrators;
