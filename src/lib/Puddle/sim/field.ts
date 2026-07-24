// CPU realization of the "textures" the passes read and write. Scalar fields are
// cell-centered; flux is the MAC-staggered face pair.

import type { FluxField, Grid, ScalarField } from './types';

export function makeScalar(grid: Grid): ScalarField {
	const { nx, ny } = grid;
	return { nx, ny, data: new Float32Array(nx * ny) };
}

export function makeFlux(grid: Grid): FluxField {
	const { nx, ny } = grid;
	return {
		nx,
		ny,
		fx: new Float32Array((nx + 1) * ny),
		fy: new Float32Array(nx * (ny + 1)),
	};
}
