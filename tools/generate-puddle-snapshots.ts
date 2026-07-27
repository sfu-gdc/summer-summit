import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';
import { createServer } from 'vite';

import type {
	LANDING_PUDDLE_PROFILES as LandingPuddleProfilesValue,
	LandingPuddleProfile,
} from '../src/lib/LandingHero/puddleProfiles';
import type { PUDDLE_DEFAULTS as PuddleDefaultsValue } from '../src/lib/Puddle/config';
import type {
	puddleClipShape as PuddleClipShapeValue,
	puddlePath as PuddlePathValue,
} from '../src/lib/Puddle/render/puddleRenderer';
import type { createPuddleSimulation as CreatePuddleSimulationValue } from '../src/lib/Puddle/runtime/puddleSimulation';
import type {
	assertDryGuardBand as AssertDryGuardBandValue,
	assertDryGuardFlux as AssertDryGuardFluxValue,
	encodePuddleSnapshot as EncodePuddleSnapshotValue,
} from '../src/lib/Puddle/snapshot/binary';
import type { snapshotCompatibilityHash as SnapshotCompatibilityHashValue } from '../src/lib/Puddle/snapshot/compatibility';
import type { PuddleSnapshotAsset, PuddleSnapshotName } from '../src/lib/Puddle/snapshot/types';

interface ConfigModule {
	PUDDLE_DEFAULTS: typeof PuddleDefaultsValue;
}
interface ProfileModule {
	LANDING_PUDDLE_PROFILES: typeof LandingPuddleProfilesValue;
}
interface SimulationModule {
	createPuddleSimulation: typeof CreatePuddleSimulationValue;
}
interface RendererModule {
	puddleClipShape: typeof PuddleClipShapeValue;
	puddlePath: typeof PuddlePathValue;
}
interface CompatibilityModule {
	snapshotCompatibilityHash: typeof SnapshotCompatibilityHashValue;
}
interface BinaryModule {
	assertDryGuardBand: typeof AssertDryGuardBandValue;
	assertDryGuardFlux: typeof AssertDryGuardFluxValue;
	encodePuddleSnapshot: typeof EncodePuddleSnapshotValue;
}

const root = process.cwd();
const server = await createServer({
	appType: 'custom',
	configFile: false,
	root,
	resolve: { alias: { $lib: path.join(root, 'src/lib') } },
	server: { middlewareMode: true },
});

try {
	const { PUDDLE_DEFAULTS } = (await server.ssrLoadModule(
		'/src/lib/Puddle/config.ts',
	)) as ConfigModule;
	const { LANDING_PUDDLE_PROFILES } = (await server.ssrLoadModule(
		'/src/lib/LandingHero/puddleProfiles.ts',
	)) as ProfileModule;
	const { createPuddleSimulation } = (await server.ssrLoadModule(
		'/src/lib/Puddle/runtime/puddleSimulation.ts',
	)) as SimulationModule;
	const { puddleClipShape, puddlePath } = (await server.ssrLoadModule(
		'/src/lib/Puddle/render/puddleRenderer.ts',
	)) as RendererModule;
	const { snapshotCompatibilityHash } = (await server.ssrLoadModule(
		'/src/lib/Puddle/snapshot/compatibility.ts',
	)) as CompatibilityModule;
	const { assertDryGuardBand, assertDryGuardFlux, encodePuddleSnapshot } =
		(await server.ssrLoadModule('/src/lib/Puddle/snapshot/binary.ts')) as BinaryModule;

	const profiles: Record<PuddleSnapshotName, LandingPuddleProfile> = {
		default: {
			bowlWidth: PUDDLE_DEFAULTS.bowlWidth,
			bowlHeight: PUDDLE_DEFAULTS.bowlHeight,
			level: PUDDLE_DEFAULTS.level,
			threshold: PUDDLE_DEFAULTS.threshold,
			cellSize: PUDDLE_DEFAULTS.cellSize,
		},
		...LANDING_PUDDLE_PROFILES,
	};
	const guardBand = 6;
	const records = {} as Record<PuddleSnapshotName, PuddleSnapshotAsset>;
	await mkdir(path.join(root, 'static/puddle'), { recursive: true });
	await mkdir(path.join(root, 'src/lib/Puddle/generated'), { recursive: true });

	for (const [name, profile] of Object.entries(profiles) as [
		PuddleSnapshotName,
		LandingPuddleProfile,
	][]) {
		const simulation = {
			seed: PUDDLE_DEFAULTS.seed,
			level: profile.level,
			noiseAmp: PUDDLE_DEFAULTS.noiseAmp,
			bowlWidth: profile.bowlWidth,
			bowlHeight: profile.bowlHeight,
			bowlAmp: PUDDLE_DEFAULTS.bowlAmp,
			bowlRim: PUDDLE_DEFAULTS.bowlRim,
			integrator: PUDDLE_DEFAULTS.integrator,
			momentumSmoothing: PUDDLE_DEFAULTS.momentumSmoothing,
			momentumRetention: PUDDLE_DEFAULTS.momentumRetention,
			timeScale: PUDDLE_DEFAULTS.timeScale,
			baseSubstep: PUDDLE_DEFAULTS.baseSubstep,
			cflSafety: PUDDLE_DEFAULTS.cflSafety,
			minWaveDepth: PUDDLE_DEFAULTS.minWaveDepth,
			maxSubsteps: PUDDLE_DEFAULTS.maxSubsteps,
			gravityDrift: PUDDLE_DEFAULTS.gravityDrift,
			driftAmp: PUDDLE_DEFAULTS.driftAmp,
			driftRateHz: PUDDLE_DEFAULTS.driftRateHz,
			rainInterval: PUDDLE_DEFAULTS.rainInterval,
			rainAmount: PUDDLE_DEFAULTS.rainAmount,
			rainRadius: PUDDLE_DEFAULTS.rainRadius,
		};
		const rimCells = Math.ceil((PUDDLE_DEFAULTS.bowlRim * profile.bowlWidth) / profile.cellSize);
		const cols = Math.ceil(profile.bowlWidth / profile.cellSize) + 2 * (guardBand + rimCells + 2);
		const rows = Math.ceil(profile.bowlHeight / profile.cellSize) + 2 * (guardBand + rimCells + 2);
		const geometry = {
			width: cols * profile.cellSize,
			height: rows * profile.cellSize,
			cols,
			rows,
			cellSize: profile.cellSize,
		};
		const sim = createPuddleSimulation(geometry, simulation);
		sim.settle(PUDDLE_DEFAULTS.settleSubsteps);
		const depth = Float32Array.from(sim.height);
		const compatibilityHash = snapshotCompatibilityHash({
			cellSize: profile.cellSize,
			settleSubsteps: PUDDLE_DEFAULTS.settleSubsteps,
			simulation,
		});
		const snapshot = {
			nx: cols,
			ny: rows,
			cellSize: profile.cellSize,
			guardBand,
			seed: simulation.seed,
			compatibilityHash,
			totalMass: sim.totalMass(),
			depth,
		};
		assertDryGuardBand(snapshot);
		assertDryGuardFlux(cols, rows, guardBand, sim.flux);
		const mask = Uint8Array.from(depth, (value) => (value > profile.threshold ? 1 : 0));
		const fileName = `${name}.bin`;
		await writeFile(
			path.join(root, 'static/puddle', fileName),
			new Uint8Array(encodePuddleSnapshot(snapshot)),
		);
		records[name] = {
			name,
			url: `/puddle/${fileName}`,
			nx: cols,
			ny: rows,
			cellSize: profile.cellSize,
			compatibilityHash,
			path: puddlePath(mask, cols, rows, profile.cellSize),
			clip: puddleClipShape(mask, cols, rows, profile.cellSize),
		};
	}

	const source = `// Generated by tools/generate-puddle-snapshots.ts. Do not edit.\nimport type { PuddleSnapshotAsset, PuddleSnapshotName } from '../snapshot/types';\n\nexport const PUDDLE_SNAPSHOTS = ${JSON.stringify(records, null, '\t')} as const satisfies Record<PuddleSnapshotName, PuddleSnapshotAsset>;\n`;
	const outputPath = path.join(root, 'src/lib/Puddle/generated/puddleSnapshots.ts');
	const prettierConfig = (await resolveConfig(outputPath)) ?? {};
	await writeFile(outputPath, await format(source, { ...prettierConfig, filepath: outputPath }));
} finally {
	await server.close();
}
