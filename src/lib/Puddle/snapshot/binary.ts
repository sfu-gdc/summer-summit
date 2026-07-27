const MAGIC = 0x4c445550;
const VERSION = 1;
const HEADER_BYTES = 48;

export interface PuddleSnapshot {
	readonly nx: number;
	readonly ny: number;
	readonly cellSize: number;
	readonly guardBand: number;
	readonly seed: number;
	readonly compatibilityHash: number;
	readonly totalMass: number;
	readonly depth: Float32Array;
}

export function encodePuddleSnapshot(snapshot: PuddleSnapshot): ArrayBuffer {
	const cellCount = snapshot.nx * snapshot.ny;
	if (snapshot.depth.length !== cellCount) throw new Error('Snapshot depth length is invalid');
	const buffer = new ArrayBuffer(HEADER_BYTES + cellCount * Float32Array.BYTES_PER_ELEMENT);
	const view = new DataView(buffer);
	view.setUint32(0, MAGIC, true);
	view.setUint16(4, VERSION, true);
	view.setUint16(6, HEADER_BYTES, true);
	view.setUint32(8, snapshot.nx, true);
	view.setUint32(12, snapshot.ny, true);
	view.setFloat32(16, snapshot.cellSize, true);
	view.setUint32(20, snapshot.guardBand, true);
	view.setInt32(24, snapshot.seed, true);
	view.setUint32(28, snapshot.compatibilityHash, true);
	view.setFloat64(32, snapshot.totalMass, true);
	view.setUint32(40, cellCount, true);
	new Float32Array(buffer, HEADER_BYTES, cellCount).set(snapshot.depth);
	return buffer;
}

export function decodePuddleSnapshot(buffer: ArrayBuffer): PuddleSnapshot {
	if (buffer.byteLength < HEADER_BYTES) throw new Error('Snapshot is truncated');
	const view = new DataView(buffer);
	if (view.getUint32(0, true) !== MAGIC) throw new Error('Snapshot magic is invalid');
	if (view.getUint16(4, true) !== VERSION) throw new Error('Snapshot version is unsupported');
	const headerBytes = view.getUint16(6, true);
	const nx = view.getUint32(8, true);
	const ny = view.getUint32(12, true);
	const cellCount = view.getUint32(40, true);
	if (
		headerBytes !== HEADER_BYTES ||
		nx === 0 ||
		ny === 0 ||
		cellCount !== nx * ny ||
		buffer.byteLength !== headerBytes + cellCount * Float32Array.BYTES_PER_ELEMENT
	) {
		throw new Error('Snapshot dimensions are invalid');
	}
	const depth = new Float32Array(cellCount);
	depth.set(new Float32Array(buffer, headerBytes, cellCount));
	return {
		nx,
		ny,
		cellSize: view.getFloat32(16, true),
		guardBand: view.getUint32(20, true),
		seed: view.getInt32(24, true),
		compatibilityHash: view.getUint32(28, true),
		totalMass: view.getFloat64(32, true),
		depth,
	};
}

export function assertDryGuardBand(
	snapshot: Pick<PuddleSnapshot, 'nx' | 'ny' | 'guardBand' | 'depth'>,
	epsilon = 1e-6,
): void {
	const { nx, ny, guardBand, depth } = snapshot;
	if (guardBand < 1 || guardBand * 2 >= nx || guardBand * 2 >= ny) {
		throw new Error('Snapshot guard band is invalid');
	}
	for (let y = 0; y < ny; y++) {
		for (let x = 0; x < nx; x++) {
			if (x >= guardBand && x < nx - guardBand && y >= guardBand && y < ny - guardBand) {
				continue;
			}
			if ((depth[y * nx + x] ?? 0) > epsilon) {
				throw new Error(`Snapshot guard band is wet at ${x.toString()},${y.toString()}`);
			}
		}
	}
}

export function assertDryGuardFlux(
	nx: number,
	ny: number,
	guardBand: number,
	flux: { readonly fx: ArrayLike<number>; readonly fy: ArrayLike<number> },
	epsilon = 1e-6,
): void {
	for (let y = 0; y < ny; y++) {
		for (let x = 0; x <= nx; x++) {
			if (x > guardBand && x < nx - guardBand && y >= guardBand && y < ny - guardBand) {
				continue;
			}
			if (Math.abs(flux.fx[y * (nx + 1) + x] ?? 0) > epsilon) {
				throw new Error(`Snapshot guard-band x-flux is nonzero at ${x.toString()},${y.toString()}`);
			}
		}
	}
	for (let y = 0; y <= ny; y++) {
		for (let x = 0; x < nx; x++) {
			if (y > guardBand && y < ny - guardBand && x >= guardBand && x < nx - guardBand) {
				continue;
			}
			if (Math.abs(flux.fy[y * nx + x] ?? 0) > epsilon) {
				throw new Error(`Snapshot guard-band y-flux is nonzero at ${x.toString()},${y.toString()}`);
			}
		}
	}
}

export function remapCenteredDepth(
	source: Pick<PuddleSnapshot, 'nx' | 'ny' | 'cellSize' | 'depth'>,
	targetNx: number,
	targetNy: number,
	targetCellSize: number,
): Float32Array {
	if (source.cellSize !== targetCellSize) {
		throw new Error('Snapshot cell size is incompatible with the target grid');
	}
	const cellSize = source.cellSize;
	const cellArea = cellSize * cellSize;
	const target = new Float32Array(targetNx * targetNy);
	const sourceLeft = (-source.nx * cellSize) / 2;
	const sourceTop = (-source.ny * cellSize) / 2;
	const targetLeft = (-targetNx * cellSize) / 2;
	const targetTop = (-targetNy * cellSize) / 2;
	for (let y = 0; y < targetNy; y++) {
		const targetCellTop = targetTop + y * cellSize;
		const targetCellBottom = targetCellTop + cellSize;
		const sourceYStart = Math.max(0, Math.floor((targetCellTop - sourceTop) / cellSize));
		const sourceYEnd = Math.min(
			source.ny - 1,
			Math.ceil((targetCellBottom - sourceTop) / cellSize) - 1,
		);
		for (let x = 0; x < targetNx; x++) {
			const targetCellLeft = targetLeft + x * cellSize;
			const targetCellRight = targetCellLeft + cellSize;
			const sourceXStart = Math.max(0, Math.floor((targetCellLeft - sourceLeft) / cellSize));
			const sourceXEnd = Math.min(
				source.nx - 1,
				Math.ceil((targetCellRight - sourceLeft) / cellSize) - 1,
			);
			let depth = 0;
			for (let sourceY = sourceYStart; sourceY <= sourceYEnd; sourceY++) {
				const sourceCellTop = sourceTop + sourceY * cellSize;
				const overlapY = Math.max(
					0,
					Math.min(targetCellBottom, sourceCellTop + cellSize) -
						Math.max(targetCellTop, sourceCellTop),
				);
				for (let sourceX = sourceXStart; sourceX <= sourceXEnd; sourceX++) {
					const sourceCellLeft = sourceLeft + sourceX * cellSize;
					const overlapX = Math.max(
						0,
						Math.min(targetCellRight, sourceCellLeft + cellSize) -
							Math.max(targetCellLeft, sourceCellLeft),
					);
					depth +=
						(source.depth[sourceY * source.nx + sourceX] ?? 0) * ((overlapX * overlapY) / cellArea);
				}
			}
			target[y * targetNx + x] = depth;
		}
	}
	return target;
}
