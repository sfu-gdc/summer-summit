import { PUDDLE_DEFAULTS } from './config';

export interface PuddleGeometryOptions {
	readonly cellSize: number;
	readonly maxCells: number;
}

export interface PuddleGeometry {
	readonly width: number;
	readonly height: number;
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
	const measuredWidth = Number.isFinite(width) && width > 0 ? width : 0;
	const measuredHeight = Number.isFinite(height) && height > 0 ? height : 0;
	const cellCap =
		Number.isFinite(options.maxCells) && options.maxCells >= 1
			? Math.floor(options.maxCells)
			: PUDDLE_DEFAULTS.maxCells;
	const cell =
		Number.isFinite(options.cellSize) && options.cellSize >= 1
			? options.cellSize
			: PUDDLE_DEFAULTS.cellSize;
	const cols =
		measuredWidth > 0 ? Math.min(cellCap, Math.max(8, Math.round(measuredWidth / cell))) : 0;
	const rows =
		measuredHeight > 0 ? Math.min(cellCap, Math.max(6, Math.round(measuredHeight / cell))) : 0;
	const safeCols = Math.max(cols, 1);
	const safeRows = Math.max(rows, 1);

	return {
		width: measuredWidth,
		height: measuredHeight,
		cols,
		rows,
		ready: cols > 0 && rows > 0,
		viewBox: `0 0 ${safeCols.toString()} ${safeRows.toString()}`,
		clipTransform: `scale(${(1 / safeCols).toString()} ${(1 / safeRows).toString()})`,
	};
}
