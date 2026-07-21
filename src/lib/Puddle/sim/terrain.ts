import { domainCoordinate } from './brands';
import { fbm, sdRoundRect } from './noise';
import type { Params } from './params';
import type { Grid } from './types';

function smooth(value: number): number {
	return value * value * (3 - 2 * value);
}

export function makeTerrain(grid: Grid, params: Params, seed: number): Float32Array {
	const { nx: columnCount, ny: rowCount } = grid;
	const terrain = new Float32Array(columnCount * rowCount);
	for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
			// Cell-center coordinates in the normalized terrain domain [-0.5, 0.5].
			const terrainX = domainCoordinate((columnIndex + 0.5) / columnCount - 0.5);
			const terrainY = domainCoordinate((rowIndex + 0.5) / rowCount - 0.5);
			// Signed distance drives the bowl wall; noise roughens the pooled edge.
			const signedDistance = sdRoundRect(
				terrainX,
				terrainY,
				params.bowlHalfX,
				params.bowlHalfY,
				params.bowlRadius,
			);
			const wallHeight =
				params.bowlAmp * smooth(Math.max(0, Math.min(1, (signedDistance + 0.02) / params.bowlRim)));
			const noiseHeight =
				(fbm(terrainX * params.noiseFreq + 10, terrainY * params.noiseFreq + 10, seed) - 0.5) *
				2 *
				params.noiseAmp;
			terrain[rowIndex * columnCount + columnIndex] = wallHeight + noiseHeight;
		}
	}
	return terrain;
}
