import { domainCoordinate } from './brands';
import { fbm, sdRoundRect } from './noise';
import type { Params } from './params';
import type { Grid } from './types';

export interface WorldTerrainOptions {
	readonly cellSize: number;
	readonly bowlWidth: number;
	readonly bowlHeight: number;
	readonly bowlRim: number;
}

function smooth(value: number): number {
	return value * value * (3 - 2 * value);
}

export function makeTerrain(
	grid: Grid,
	params: Params,
	seed: number,
	world?: WorldTerrainOptions,
): Float32Array {
	const { nx: columnCount, ny: rowCount } = grid;
	const terrain = new Float32Array(columnCount * rowCount);
	for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
			const terrainX = domainCoordinate(
				world
					? ((columnIndex + 0.5 - columnCount / 2) * world.cellSize) / Math.max(world.bowlWidth, 1)
					: (columnIndex + 0.5) / columnCount - 0.5,
			);
			const terrainY = domainCoordinate(
				world
					? ((rowIndex + 0.5 - rowCount / 2) * world.cellSize) / Math.max(world.bowlWidth, 1)
					: (rowIndex + 0.5) / rowCount - 0.5,
			);
			const bowlHalfX = world ? 0.5 : params.bowlHalfX;
			const bowlHalfY = world
				? world.bowlHeight / Math.max(world.bowlWidth, 1) / 2
				: params.bowlHalfY;
			// Existing normalized radius/rim semantics are anchored to the configured
			// bowl width so they stay physical when the viewport grows.
			const bowlRadius = params.bowlRadius;
			const bowlRim = world ? world.bowlRim : params.bowlRim;
			// Signed distance drives the bowl wall; noise roughens the pooled edge.
			const signedDistance = sdRoundRect(terrainX, terrainY, bowlHalfX, bowlHalfY, bowlRadius);
			const wallHeight =
				params.bowlAmp * smooth(Math.max(0, Math.min(1, (signedDistance + 0.02) / bowlRim)));
			const noiseHeight =
				(fbm(terrainX * params.noiseFreq + 10, terrainY * params.noiseFreq + 10, seed) - 0.5) *
				2 *
				params.noiseAmp;
			terrain[rowIndex * columnCount + columnIndex] = wallHeight + noiseHeight;
		}
	}
	return terrain;
}
