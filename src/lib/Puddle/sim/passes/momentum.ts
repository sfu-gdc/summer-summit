import type { Grid, PassCtx } from '../types';
import { clamp, sampleFace, smoothField, writeField } from './common';

interface MomentumScratch {
	xVelocity: Float32Array;
	yVelocity: Float32Array;
	smoothingScratch: Float32Array;
}

const scratchByGrid = new WeakMap<Grid, MomentumScratch>();

function getMomentumScratch(grid: Grid): MomentumScratch {
	const { nx, ny } = grid;
	const cached = scratchByGrid.get(grid);
	if (cached) return cached;
	const scratch = {
		xVelocity: new Float32Array((nx + 1) * ny),
		yVelocity: new Float32Array(nx * (ny + 1)),
		smoothingScratch: new Float32Array(Math.max((nx + 1) * ny, nx * (ny + 1))),
	};
	scratchByGrid.set(grid, scratch);
	return scratch;
}

export function runMomentum(ctx: PassCtx): void {
	const { nx, ny } = ctx.grid;
	const inputFlux = ctx.readFlux();
	const updatedDepth = ctx.readScalar('height').data;
	// Flux-to-velocity uses the pre-update upwind depth to avoid a dry-cell velocity spike.
	const previousDepth = ctx.readPrevScalar('height').data;
	const scale = ctx.readScalar('scale').data;
	const outputFlux = ctx.writeFlux();
	const { dt, params } = ctx;
	const { depthFloor, momentumSmoothing, momentumRetention } = params;
	const { xVelocity, yVelocity, smoothingScratch } = getMomentumScratch(ctx.grid);
	const maxVelocity = dt > 0 ? 1 / dt : 0;

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

	writeField(outputFlux.fx, nx + 1, (_value, faceIndex, column, row) => {
		if (column === 0 || column === nx) return 0;
		const normalVelocity = xVelocity[faceIndex] ?? 0;
		const tangentialVelocity =
			((yVelocity[row * nx + (column - 1)] ?? 0) +
				(yVelocity[row * nx + column] ?? 0) +
				(yVelocity[(row + 1) * nx + (column - 1)] ?? 0) +
				(yVelocity[(row + 1) * nx + column] ?? 0)) *
			0.25;
		const advectedVelocity = sampleFace(
			xVelocity,
			nx + 1,
			ny,
			column - dt * normalVelocity,
			row + 0.5 - dt * tangentialVelocity,
			0,
			0.5,
		);
		const sourceDepth =
			advectedVelocity > 0
				? (updatedDepth[row * nx + (column - 1)] ?? 0)
				: (updatedDepth[row * nx + column] ?? 0);
		return sourceDepth > depthFloor ? momentumRetention * advectedVelocity * sourceDepth : 0;
	});
	writeField(outputFlux.fy, nx, (_value, faceIndex, column, row) => {
		if (row === 0 || row === ny) return 0;
		const normalVelocity = yVelocity[faceIndex] ?? 0;
		const tangentialVelocity =
			((xVelocity[(row - 1) * (nx + 1) + column] ?? 0) +
				(xVelocity[(row - 1) * (nx + 1) + column + 1] ?? 0) +
				(xVelocity[row * (nx + 1) + column] ?? 0) +
				(xVelocity[row * (nx + 1) + column + 1] ?? 0)) *
			0.25;
		const advectedVelocity = sampleFace(
			yVelocity,
			nx,
			ny + 1,
			column + 0.5 - dt * tangentialVelocity,
			row - dt * normalVelocity,
			0.5,
			0,
		);
		const sourceDepth =
			advectedVelocity > 0
				? (updatedDepth[(row - 1) * nx + column] ?? 0)
				: (updatedDepth[row * nx + column] ?? 0);
		return sourceDepth > depthFloor ? momentumRetention * advectedVelocity * sourceDepth : 0;
	});

	smoothField(outputFlux.fx, smoothingScratch, nx + 1, ny, 1, nx, 1, ny - 1, momentumSmoothing);
	smoothField(outputFlux.fy, smoothingScratch, nx, ny + 1, 1, nx - 1, 1, ny, momentumSmoothing);
}
