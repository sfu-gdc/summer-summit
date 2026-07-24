import type { PassCtx, PassDesc, PassKind } from '../types';
import { runMomentum } from './momentum';
import { runFluxUpdate, runHeightUpdate, runOutflowScale } from './pipes';

interface PassRegistration {
	readonly reads: PassDesc['reads'];
	readonly writes: PassDesc['writes'];
	readonly label: string;
	readonly run: (ctx: PassCtx) => void;
}

const PASS_REGISTRY = {
	flux_update: {
		reads: ['height', 'terrain', 'flux'],
		writes: 'flux',
		label: 'flux update (virtual pipes)',
		run: runFluxUpdate,
	},
	outflow_scale: {
		reads: ['flux', 'height'],
		writes: 'scale',
		label: 'outflow scaling',
		run: runOutflowScale,
	},
	height_update: {
		reads: ['flux', 'scale', 'height'],
		writes: 'height',
		label: 'height update',
		run: runHeightUpdate,
	},
	momentum: {
		reads: ['flux', 'height', 'scale'],
		writes: 'flux',
		label: 'momentum transport (semi-Lagrangian)',
		run: runMomentum,
	},
} as const satisfies Record<PassKind, PassRegistration>;

function descriptor(kind: PassKind): PassDesc {
	const { reads, writes } = PASS_REGISTRY[kind];
	return { kind, reads, writes };
}

export const PASSES = {
	fluxUpdate: descriptor('flux_update'),
	outflowScale: descriptor('outflow_scale'),
	heightUpdate: descriptor('height_update'),
	momentum: descriptor('momentum'),
} as const;

export function runKernel(kind: PassKind, ctx: PassCtx): void {
	PASS_REGISTRY[kind].run(ctx);
}

export function describePass(kind: PassKind): string {
	return PASS_REGISTRY[kind].label;
}
