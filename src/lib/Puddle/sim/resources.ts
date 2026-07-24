import { worldUnits, type Role, type WorldUnits } from './brands';
import { makeFlux, makeScalar } from './field';
import type { FluxField, Grid, ScalarField, ScalarRole, StateStats } from './types';

type MutableRole = Exclude<Role, 'terrain'>;
type MutableScalarRole = Exclude<ScalarRole, 'terrain'>;
type BufferPair<T> = readonly [T, T];
type BufferSide = 'current' | 'other';

const makeBufferPair = <T>(createBuffer: () => T): BufferPair<T> => [
	createBuffer(),
	createBuffer(),
];

export class Resources {
	readonly grid: Grid;

	private readonly heightBuffers: BufferPair<ScalarField>;
	private readonly fluxBuffers: BufferPair<FluxField>;
	private readonly scaleBuffers: BufferPair<ScalarField>;
	private readonly scalarBuffers: Record<MutableScalarRole, BufferPair<ScalarField>>;
	private readonly terrainField: ScalarField;
	// For each role, 0 or 1 identifies which buffer in its pair is current.
	private readonly currentBufferIndices: Record<MutableRole, 0 | 1> = {
		height: 0,
		flux: 0,
		scale: 0,
	};

	constructor(grid: Grid, terrainData: Float32Array) {
		this.grid = grid;
		this.heightBuffers = makeBufferPair(() => makeScalar(grid));
		this.fluxBuffers = makeBufferPair(() => makeFlux(grid));
		this.scaleBuffers = makeBufferPair(() => makeScalar(grid));
		this.scalarBuffers = {
			height: this.heightBuffers,
			scale: this.scaleBuffers,
		};
		this.terrainField = { nx: grid.nx, ny: grid.ny, data: terrainData };
	}

	currentScalar(role: ScalarRole): ScalarField {
		return this.selectScalarBuffer(role, 'current');
	}

	currentFlux(): FluxField {
		return Resources.selectBuffer(this.fluxBuffers, this.currentBufferIndices.flux, 'current');
	}

	targetScalar(role: ScalarRole): ScalarField {
		if (role === 'terrain') throw new Error("role 'terrain' is static and has no write target");
		return this.selectScalarBuffer(role, 'other');
	}

	targetFlux(): FluxField {
		return Resources.selectBuffer(this.fluxBuffers, this.currentBufferIndices.flux, 'other');
	}

	/**
	 * The other buffer holds the role's value before its last swap. It aliases
	 * `targetScalar`, whose name is intentionally reserved for writes.
	 */
	previousScalar(role: ScalarRole): ScalarField {
		return this.selectScalarBuffer(role, 'other');
	}

	swap(role: Role): void {
		if (role === 'terrain') return;
		this.currentBufferIndices[role] = this.currentBufferIndices[role] === 0 ? 1 : 0;
	}

	height(): ScalarField {
		return this.currentScalar('height');
	}

	terrain(): ScalarField {
		return this.terrainField;
	}

	applyToHeight(operation: (heightData: Float32Array, grid: Grid) => void): void {
		operation(this.height().data, this.grid);
	}

	applyToFlux(operation: (flux: FluxField, grid: Grid) => void): void {
		operation(this.currentFlux(), this.grid);
	}

	stats(): StateStats {
		const heightData = this.height().data;
		let mass = 0;
		let maxDepth = 0;
		let index = 0;
		while (index < heightData.length) {
			const depth = heightData[index] ?? 0;
			mass += depth;
			if (depth > maxDepth) maxDepth = depth;
			index += 1;
		}
		return { mass, maxDepth: worldUnits(maxDepth) };
	}

	reset(initialHeight: (xIndex: number, yIndex: number) => WorldUnits): void {
		this.currentBufferIndices.height = 0;
		this.currentBufferIndices.flux = 0;
		this.currentBufferIndices.scale = 0;
		const initialHeightData = this.heightBuffers[0].data;
		initialHeightData.set(
			initialHeightData.map((_, index) =>
				initialHeight(index % this.grid.nx, Math.floor(index / this.grid.nx)),
			),
		);
		this.heightBuffers[1].data.fill(0);
		for (const { fx, fy } of this.fluxBuffers) {
			fx.fill(0);
			fy.fill(0);
		}
		for (const { data } of this.scaleBuffers) data.fill(0);
	}

	private static selectBuffer<T>(buffers: BufferPair<T>, currentIndex: 0 | 1, side: BufferSide): T {
		return buffers[side === 'current' ? currentIndex : currentIndex === 0 ? 1 : 0];
	}

	private selectScalarBuffer(role: ScalarRole, side: BufferSide): ScalarField {
		return role === 'terrain'
			? this.terrainField
			: Resources.selectBuffer(this.scalarBuffers[role], this.currentBufferIndices[role], side);
	}
}

export function createResources(grid: Grid, terrainData: Float32Array): Resources {
	return new Resources(grid, terrainData);
}
