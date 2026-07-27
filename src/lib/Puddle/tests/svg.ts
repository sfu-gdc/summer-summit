export const nextFrame = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});

interface PuddleRun {
	x: number;
	y: number;
	width: number;
}

function runsOf(path: SVGPathElement): PuddleRun[] {
	const runs: PuddleRun[] = [];
	const commands = path.getAttribute('d') ?? '';
	const pattern = /M([\d.]+) ([\d.]+)h([\d.]+)v([\d.]+)h-([\d.]+)z/g;
	const cellSize = Number(path.ownerSVGElement?.dataset['puddleCellSize'] ?? 1);
	for (const match of commands.matchAll(pattern)) {
		const x = Number(match[1]) / cellSize;
		const y = Number(match[2]) / cellSize;
		const width = Number(match[3]) / cellSize;
		if (Number(match[4]) !== cellSize || Number(match[5]) / cellSize !== width) {
			throw new Error('invalid puddle run');
		}
		runs.push({ x, y, width });
	}
	return runs;
}

function gridSize(path: SVGPathElement): { nx: number; ny: number } {
	const renderer = path.ownerSVGElement;
	if (!renderer) throw new Error('puddle path is not inside an SVG');
	return {
		nx: Number(renderer.dataset['puddleCols']),
		ny: Number(renderer.dataset['puddleRows']),
	};
}

export function wetAt(path: SVGPathElement, fx: number, fy: number): boolean {
	const { nx, ny } = gridSize(path);
	const x = Math.floor(nx * fx);
	const y = Math.floor(ny * fy);
	return runsOf(path).some((run) => run.y === y && x >= run.x && x < run.x + run.width);
}

export function paintedFraction(path: SVGPathElement): number {
	const { nx, ny } = gridSize(path);
	const cells = runsOf(path).reduce((total, run) => total + run.width, 0);
	return cells / (nx * ny);
}

export function paintedHalves(path: SVGPathElement): { left: number; right: number } {
	const { nx } = gridSize(path);
	let left = 0;
	let right = 0;
	for (const run of runsOf(path)) {
		for (let x = run.x; x < run.x + run.width; x++) {
			if (x < nx / 2) left++;
			else right++;
		}
	}
	return { left, right };
}

export async function waitForPaintedFraction(
	path: SVGPathElement,
	maxFrames: number,
): Promise<number> {
	let fraction = 0;
	for (let i = 0; i < maxFrames; i++) {
		fraction = paintedFraction(path);
		if (fraction > 0) break;
		await nextFrame();
	}
	return fraction;
}
