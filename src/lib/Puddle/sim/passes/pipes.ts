import type { PassCtx } from '../types';
import { writeField } from './common';

function scaleDirectionalFlux(
	flux: number,
	positiveSourceScale: number,
	negativeSourceScale: number,
): number {
	return flux * (flux > 0 ? positiveSourceScale : negativeSourceScale);
}

// Clearing boundary faces keeps them at zero: no-flow walls must not retain stale ping-pong fluxes.
// Interior faces accelerate from free-surface elevation plus in-plane gravity.
export function runFluxUpdate(ctx: PassCtx): void {
	const { nx, ny } = ctx.grid;
	const depth = ctx.readScalar('height').data;
	const terrain = ctx.readScalar('terrain').data;
	const inputFlux = ctx.readFlux();
	const outputFlux = ctx.writeFlux();
	const { dt, gravity, params } = ctx;

	writeField(outputFlux.fx, nx + 1, (_value, faceIndex, column, row) => {
		if (column === 0 || column === nx) return 0;
		const leftCell = row * nx + (column - 1);
		const rightCell = row * nx + column;
		const surfaceDelta =
			(terrain[leftCell] ?? 0) +
			(depth[leftCell] ?? 0) -
			(terrain[rightCell] ?? 0) -
			(depth[rightCell] ?? 0);
		return (
			params.damping * (inputFlux.fx[faceIndex] ?? 0) +
			dt * (gravity.perp * surfaceDelta - gravity.tiltX)
		);
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
		return (
			params.damping * (inputFlux.fy[faceIndex] ?? 0) +
			dt * (gravity.perp * surfaceDelta - gravity.tiltY)
		);
	});
}

// Uniformly cap each cell's outflow to its available volume, conserving mass.
export function runOutflowScale(ctx: PassCtx): void {
	const { nx } = ctx.grid;
	const flux = ctx.readFlux();
	const depth = ctx.readScalar('height').data;
	const scale = ctx.writeScalar().data;
	const { dt } = ctx;
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
export function runHeightUpdate(ctx: PassCtx): void {
	const { nx } = ctx.grid;
	const flux = ctx.readFlux();
	const scale = ctx.readScalar('scale').data;
	const depth = ctx.readScalar('height').data;
	const nextDepth = ctx.writeScalar().data;
	const { dt } = ctx;
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
		const scaledTopFlux = scaleDirectionalFlux(topFlux, cellScale, scale[cell + nx] ?? 0);
		return Math.max(
			0,
			(depth[cell] ?? 0) +
				dt * (scaledLeftFlux - scaledRightFlux + scaledBottomFlux - scaledTopFlux),
		);
	});
}
