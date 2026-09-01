import { resolvePuddleGeometry } from '../geometry';
import { puddlePath } from '../render/puddleRenderer';
import { createPuddleSimulation } from '../runtime/puddleSimulation';
import { assertDryGuardBand, decodePuddleSnapshot, remapCenteredDepth } from '../snapshot/binary';
import type { PuddleWorkerInitMessage } from './protocol';

const HIDDEN_RELAXATION_SUBSTEPS = 6;

function createDepthPath(nx: number, ny: number, cellSize: number, threshold: number) {
	const mask = new Uint8Array(nx * ny);
	let initialized = false;
	let path = '';
	return (height: ArrayLike<number>, force = false): string | null => {
		let changed = !initialized;
		for (let index = 0; index < mask.length; index++) {
			const column = index % nx;
			const row = Math.floor(index / nx);
			const border = column === 0 || column === nx - 1 || row === 0 || row === ny - 1;
			const wet = !border && (height[index] ?? 0) > threshold ? 1 : 0;
			if (mask[index] !== wet) {
				mask[index] = wet;
				changed = true;
			}
		}
		initialized = true;
		if (!changed) return force ? path : null;
		path = puddlePath(mask, nx, ny, cellSize);
		return path;
	};
}

export async function initializePuddleWorkerState(
	message: PuddleWorkerInitMessage,
	loadSnapshot: (url: string) => Promise<ArrayBuffer>,
) {
	const geometry = resolvePuddleGeometry(message.width, message.height, message.geometry);
	if (!geometry.ready) throw new Error('Puddle host has no measurable area');
	const sim = createPuddleSimulation(geometry, message.simulation);
	let snapshotLoaded = false;
	try {
		const snapshot = decodePuddleSnapshot(await loadSnapshot(message.snapshotUrl));
		assertDryGuardBand(snapshot);
		if (
			snapshot.compatibilityHash !== message.compatibilityHash ||
			snapshot.seed !== message.simulation.seed
		) {
			throw new Error('Puddle snapshot is incompatible with the current options');
		}
		sim.loadHeight(remapCenteredDepth(snapshot, geometry.cols, geometry.rows, geometry.cellSize));
		sim.settle(HIDDEN_RELAXATION_SUBSTEPS);
		snapshotLoaded = true;
	} catch {
		sim.settle(message.settleSubsteps);
	}
	const massCap = sim.totalMass();
	const renderPath = createDepthPath(
		geometry.cols,
		geometry.rows,
		geometry.cellSize,
		message.threshold,
	);
	return {
		sim,
		nx: geometry.cols,
		ny: geometry.rows,
		cellSize: geometry.cellSize,
		massCap,
		snapshotLoaded,
		path: (force = false) => renderPath(sim.height, force),
	};
}
