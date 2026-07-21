import type { Grid, PassCtx, PassDesc, PassKind } from './types';

type FieldTransform = (value: number, index: number, column: number, row: number) => number;

function writeField(field: Float32Array, width: number, transform: FieldTransform): void {
	field.set(
		field.map((value, index) => transform(value, index, index % width, Math.floor(index / width))),
	);
}

function scaleDirectionalFlux(
	flux: number,
	positiveSourceScale: number,
	negativeSourceScale: number,
): number {
	return flux * (flux > 0 ? positiveSourceScale : negativeSourceScale);
}

// Clearing boundary faces keeps them at zero: no-flow walls must not retain
// stale ping-pong fluxes.
// Interior faces accelerate from the free-surface elevation difference plus
// in-plane gravity; `damping` retains part of the previous face flux.
function runFluxUpdate(ctx: PassCtx): void {
	const { nx, ny } = ctx.grid;
	const depth = ctx.readScalar('height').data;
	const terrain = ctx.readScalar('terrain').data;
	const inputFlux = ctx.readFlux();
	const outputFlux = ctx.writeFlux();
	const dt = ctx.dt;
	const { damping } = ctx.params;
	const normalGravity = ctx.gravity.perp;
	const { tiltX, tiltY } = ctx.gravity;

	writeField(outputFlux.fx, nx + 1, (_value, faceIndex, column, row) => {
		if (column === 0 || column === nx) return 0;

		const leftCell = row * nx + (column - 1);
		const rightCell = row * nx + column;
		const surfaceDelta =
			(terrain[leftCell] ?? 0) +
			(depth[leftCell] ?? 0) -
			(terrain[rightCell] ?? 0) -
			(depth[rightCell] ?? 0);
		return damping * (inputFlux.fx[faceIndex] ?? 0) + dt * (normalGravity * surfaceDelta - tiltX);
	});
	writeField(outputFlux.fy, nx, (_value, faceIndex, column, row) => {
		if (row === 0 || row === ny) return 0;

		const bottomCell = (row - 1) * nx + column;
		const topCell = row * nx + column;
		const surfaceDelta =
			(terrain[bottomCell] ?? 0) +
			(depth[bottomCell] ?? 0) -
			(terrain[topCell] ?? 0) -
			(depth[topCell] ?? 0);
		return damping * (inputFlux.fy[faceIndex] ?? 0) + dt * (normalGravity * surfaceDelta - tiltY);
	});
}

// Uniformly cap each cell's outflow to its available volume, conserving mass
// while preventing negative depth.
function runOutflowScale(ctx: PassCtx): void {
	const { nx } = ctx.grid;
	const flux = ctx.readFlux();
	const depth = ctx.readScalar('height').data;
	const scale = ctx.writeScalar().data;
	const dt = ctx.dt;
	writeField(scale, nx, (_value, cell, column, row) => {
		const outflow =
			Math.max(0, -(flux.fx[row * (nx + 1) + column] ?? 0)) +
			Math.max(0, flux.fx[row * (nx + 1) + column + 1] ?? 0) +
			Math.max(0, -(flux.fy[row * nx + column] ?? 0)) +
			Math.max(0, flux.fy[(row + 1) * nx + column] ?? 0);
		const outflowVolume = outflow * dt;
		const availableDepth = depth[cell] ?? 0;
		return outflowVolume > availableDepth && outflowVolume > 0 ? availableDepth / outflowVolume : 1;
	});
}

// A face is scaled by its source cell, preserving the outflow cap above.
function runHeightUpdate(ctx: PassCtx): void {
	const { nx, ny } = ctx.grid;
	const flux = ctx.readFlux();
	const scale = ctx.readScalar('scale').data;
	const depth = ctx.readScalar('height').data;
	const nextDepth = ctx.writeScalar().data;
	const dt = ctx.dt;
	// Face flux is positive toward +x/+y, so each face uses its upstream cell's scale.
	writeField(nextDepth, nx, (_value, cell, column, row) => {
		const leftFlux = flux.fx[row * (nx + 1) + column] ?? 0;
		const rightFlux = flux.fx[row * (nx + 1) + column + 1] ?? 0;
		const bottomFlux = flux.fy[row * nx + column] ?? 0;
		const topFlux = flux.fy[(row + 1) * nx + column] ?? 0;
		const cellScale = scale[cell] ?? 0;
		const scaledLeftFlux = scaleDirectionalFlux(
			leftFlux,
			column > 0 ? (scale[cell - 1] ?? 0) : 0,
			cellScale,
		);
		const scaledRightFlux = scaleDirectionalFlux(
			rightFlux,
			cellScale,
			column < nx - 1 ? (scale[cell + 1] ?? 0) : 0,
		);
		const scaledBottomFlux = scaleDirectionalFlux(
			bottomFlux,
			row > 0 ? (scale[cell - nx] ?? 0) : 0,
			cellScale,
		);
		const scaledTopFlux = scaleDirectionalFlux(
			topFlux,
			cellScale,
			row < ny - 1 ? (scale[cell + nx] ?? 0) : 0,
		);
		return Math.max(
			0,
			(depth[cell] ?? 0) +
				dt * (scaledLeftFlux - scaledRightFlux + scaledBottomFlux - scaledTopFlux),
		);
	});
}

interface MomentumScratch {
	xVelocity: Float32Array; // x-normal velocity on vertical faces
	yVelocity: Float32Array; // y-normal velocity on horizontal faces
	smoothingScratch: Float32Array; // checkerboard-damping scratch space
}
const scratchByGrid = new WeakMap<Grid, MomentumScratch>();

function createMomentumScratch({ nx, ny }: Grid): MomentumScratch {
	return {
		xVelocity: new Float32Array((nx + 1) * ny),
		yVelocity: new Float32Array(nx * (ny + 1)),
		smoothingScratch: new Float32Array(Math.max((nx + 1) * ny, nx * (ny + 1))),
	};
}

function getMomentumScratch(grid: Grid): MomentumScratch {
	const cached = scratchByGrid.get(grid);
	if (cached) return cached;

	const scratch = createMomentumScratch(grid);
	scratchByGrid.set(grid, scratch);
	return scratch;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function smoothField(
	field: Float32Array,
	scratch: Float32Array,
	width: number,
	height: number,
	minColumn: number,
	maxColumn: number,
	minRow: number,
	maxRow: number,
	strength: number,
): void {
	scratch.set(field.subarray(0, width * height));
	writeField(field, width, (value, index, column, row) => {
		if (column < minColumn || column >= maxColumn || row < minRow || row >= maxRow) {
			return value;
		}

		const mean =
			((scratch[index - 1] ?? 0) +
				(scratch[index + 1] ?? 0) +
				(scratch[index - width] ?? 0) +
				(scratch[index + width] ?? 0)) *
			0.25;
		return (scratch[index] ?? 0) * (1 - strength) + mean * strength;
	});
}

function sampleFace(
	field: Float32Array,
	width: number,
	height: number,
	positionX: number,
	positionY: number,
	offsetX: number,
	offsetY: number,
): number {
	const gridX = clamp(positionX - offsetX, 0, width - 1);
	const gridY = clamp(positionY - offsetY, 0, height - 1);
	const leftColumn = Math.floor(gridX);
	const bottomRow = Math.floor(gridY);
	const rightColumn = Math.min(width - 1, leftColumn + 1);
	const topRow = Math.min(height - 1, bottomRow + 1);
	const xWeight = gridX - leftColumn;
	const yWeight = gridY - bottomRow;
	const bottomLeft = field[bottomRow * width + leftColumn] ?? 0;
	const bottomRight = field[bottomRow * width + rightColumn] ?? 0;
	const topLeft = field[topRow * width + leftColumn] ?? 0;
	const topRight = field[topRow * width + rightColumn] ?? 0;
	return (
		(bottomLeft * (1 - xWeight) + bottomRight * xWeight) * (1 - yWeight) +
		(topLeft * (1 - xWeight) + topRight * xWeight) * yWeight
	);
}

function runMomentum(ctx: PassCtx): void {
	const { nx, ny } = ctx.grid;
	const inputFlux = ctx.readFlux();
	const updatedDepth = ctx.readScalar('height').data;
	// Flux-to-velocity uses the pre-update upwind depth; the post-update depth
	// may be near zero after drainage and would create a spurious velocity.
	const previousDepth = ctx.readPrevScalar('height').data;
	const scale = ctx.readScalar('scale').data; // per-cell outflow throttle
	const outputFlux = ctx.writeFlux();
	const dt = ctx.dt;
	const depthFloor = ctx.params.depthFloor;
	const { momentumSmoothing, momentumRetention } = ctx.params;
	const { xVelocity, yVelocity, smoothingScratch } = getMomentumScratch(ctx.grid);
	// CFL guard limits travel to one cell per substep, keeping the backtrace
	// local. The outflow cap normally enforces this before the clamp is needed.
	const maxVelocity = dt > 0 ? 1 / dt : 0;

	// Use source-scaled flux and pre-update upwind depth; shallow sources emit no
	// momentum, preventing shoreline blowups.
	writeField(xVelocity, nx + 1, (_value, faceIndex, column, row) => {
		if (column === 0 || column === nx) return 0;

		const faceFlux = inputFlux.fx[faceIndex] ?? 0;
		const upstreamCell = faceFlux > 0 ? row * nx + (column - 1) : row * nx + column;
		const sourceDepth = previousDepth[upstreamCell] ?? 0;
		return sourceDepth > depthFloor
			? clamp((faceFlux * (scale[upstreamCell] ?? 0)) / sourceDepth, -maxVelocity, maxVelocity)
			: 0;
	});
	writeField(yVelocity, nx, (_value, faceIndex, column, row) => {
		if (row === 0 || row === ny) return 0;

		const faceFlux = inputFlux.fy[faceIndex] ?? 0;
		const upstreamCell = faceFlux > 0 ? (row - 1) * nx + column : row * nx + column;
		const sourceDepth = previousDepth[upstreamCell] ?? 0;
		return sourceDepth > depthFloor
			? clamp((faceFlux * (scale[upstreamCell] ?? 0)) / sourceDepth, -maxVelocity, maxVelocity)
			: 0;
	});

	// Keep velocities staggered: x-faces sample at (i, j + .5), with tangential
	// velocity from neighboring y-faces.
	writeField(outputFlux.fx, nx + 1, (_value, faceIndex, column, row) => {
		if (column === 0 || column === nx) return 0;

		const normalVelocity = xVelocity[faceIndex] ?? 0;
		const tangentialVelocity =
			((yVelocity[row * nx + (column - 1)] ?? 0) +
				(yVelocity[row * nx + column] ?? 0) +
				(yVelocity[(row + 1) * nx + (column - 1)] ?? 0) +
				(yVelocity[(row + 1) * nx + column] ?? 0)) *
			0.25;
		const backtraceX = column - dt * normalVelocity;
		const backtraceY = row + 0.5 - dt * tangentialVelocity;
		const advectedVelocity = sampleFace(xVelocity, nx + 1, ny, backtraceX, backtraceY, 0, 0.5);
		// Do not floor this: a dried source must emit zero flux to avoid shoreline
		// flicker.
		const sourceDepth =
			advectedVelocity > 0
				? (updatedDepth[row * nx + (column - 1)] ?? 0)
				: (updatedDepth[row * nx + column] ?? 0);
		return sourceDepth > depthFloor ? momentumRetention * advectedVelocity * sourceDepth : 0;
	});
	// y-faces sample at (i + .5, j), with tangential velocity from x-faces.
	writeField(outputFlux.fy, nx, (_value, faceIndex, column, row) => {
		if (row === 0 || row === ny) return 0;

		const normalVelocity = yVelocity[faceIndex] ?? 0;
		const tangentialVelocity =
			((xVelocity[(row - 1) * (nx + 1) + column] ?? 0) +
				(xVelocity[(row - 1) * (nx + 1) + column + 1] ?? 0) +
				(xVelocity[row * (nx + 1) + column] ?? 0) +
				(xVelocity[row * (nx + 1) + column + 1] ?? 0)) *
			0.25;
		const backtraceX = column + 0.5 - dt * tangentialVelocity;
		const backtraceY = row - dt * normalVelocity;
		const advectedVelocity = sampleFace(yVelocity, nx, ny + 1, backtraceX, backtraceY, 0.5, 0);
		const sourceDepth =
			advectedVelocity > 0
				? (updatedDepth[(row - 1) * nx + column] ?? 0)
				: (updatedDepth[row * nx + column] ?? 0);
		return sourceDepth > depthFloor ? momentumRetention * advectedVelocity * sourceDepth : 0;
	});

	smoothField(outputFlux.fx, smoothingScratch, nx + 1, ny, 1, nx, 1, ny - 1, momentumSmoothing);
	smoothField(outputFlux.fy, smoothingScratch, nx, ny + 1, 1, nx - 1, 1, ny, momentumSmoothing);
}

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
