import { assertNever, texelCoordinate, texelDistance, worldUnits } from './brands';
import type { Resources } from './resources';
import type { EmitCtx, Grid, SourceCommand, SourceEmitter } from './types';

function transformInPlace(
	data: Float32Array,
	transform: (value: number, dataIndex: number) => number,
): void {
	data.set(data.map(transform));
}

function splatInto(
	heightData: Float32Array,
	grid: Grid,
	centerX: number,
	centerY: number,
	amount: number,
	radius: number,
): void {
	const radiusSquared = Math.max(radius * radius, 1e-6);
	transformInPlace(heightData, (height, dataIndex) => {
		const distanceX = (dataIndex % grid.nx) - centerX;
		const distanceY = Math.floor(dataIndex / grid.nx) - centerY;
		return (
			height + amount * Math.exp(-(distanceX * distanceX + distanceY * distanceY) / radiusSquared)
		);
	});
}

export function applyCommand(resources: Resources, command: SourceCommand): void {
	switch (command.kind) {
		case 'splat':
			resources.applyToHeight((heightData, grid) => {
				splatInto(heightData, grid, command.x, command.y, command.amount, command.radius);
			});
			return;
		case 'rain':
			resources.applyToHeight((heightData) => {
				transformInPlace(heightData, (height) => height + command.amount);
			});
			return;
		case 'fill': {
			const terrain = resources.terrain().data;
			resources.applyToHeight((heightData) => {
				transformInPlace(heightData, (_, dataIndex) =>
					Math.max(0, command.level - (terrain[dataIndex] ?? 0)),
				);
			});
			return;
		}
		case 'wipe':
			resources.applyToHeight((heightData) => {
				heightData.fill(0);
			});
			return;
		default:
			assertNever(command, 'source command');
	}
}

/**
 * Rain as periodic raindrop splats. A drop fires each time sim-time crosses an
 * `intervalSec` boundary, and the rng advances exactly once per drop — so the
 * same seed yields the same sequence regardless of frame rate.
 */
export function rainEmitter(options: {
	intervalSec: number;
	amount: number;
	radius: number;
}): SourceEmitter {
	const { intervalSec, amount, radius } = options;
	return ({ grid, time, dt, rng }: EmitCtx): readonly SourceCommand[] => {
		const previousDropIndex = Math.floor(time / intervalSec);
		const currentDropIndex = Math.floor((time + dt) / intervalSec);
		const dropCount = Math.max(0, currentDropIndex - previousDropIndex);
		return Array.from({ length: dropCount }, (): SourceCommand => ({
			kind: 'splat',
			x: texelCoordinate(rng.range(0, grid.nx)),
			y: texelCoordinate(rng.range(0, grid.ny)),
			amount: worldUnits(amount),
			radius: texelDistance(radius),
		}));
	};
}
