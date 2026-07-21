import { PUDDLE_DEFAULTS } from './config';

export interface PuddleGeometryOptions {
	readonly cellSize: number;
	readonly maxCells: number;
}

export interface PuddleGeometry {
	readonly cols: number;
	readonly rows: number;
	readonly ready: boolean;
	readonly viewBox: string;
	readonly clipTransform: string;
}

export function resolvePuddleGeometry(
	width: number,
	height: number,
	options: PuddleGeometryOptions,
): PuddleGeometry {
	const cellCap =
		Number.isFinite(options.maxCells) && options.maxCells >= 1
			? Math.floor(options.maxCells)
			: PUDDLE_DEFAULTS.maxCells;
	const cell =
		Number.isFinite(options.cellSize) && options.cellSize >= 1
			? options.cellSize
			: PUDDLE_DEFAULTS.cellSize;
	const cols = width > 0 ? Math.min(cellCap, Math.max(8, Math.round(width / cell))) : 0;
	const rows = height > 0 ? Math.min(cellCap, Math.max(6, Math.round(height / cell))) : 0;
	const safeCols = Math.max(cols, 1);
	const safeRows = Math.max(rows, 1);

	return {
		cols,
		rows,
		ready: cols > 0 && rows > 0,
		viewBox: `0 0 ${safeCols.toString()} ${safeRows.toString()}`,
		clipTransform: `scale(${(1 / safeCols).toString()} ${(1 / safeRows).toString()})`,
	};
}
