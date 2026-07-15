// Lint all commit messages starting from the first commit that diverges from its base branch.

import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import cliPkg from '@commitlint/cli/package.json' with { type: 'json' };

const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const refExists = (ref: string) => {
	try {
		git(['rev-parse', '--verify', '--quiet', ref]);
		return true;
	} catch {
		return false;
	}
};

function resolveFrom(): string {
	const fromEnv = process.env['COMMITLINT_FROM'];
	if (fromEnv !== undefined && fromEnv !== '') return fromEnv;

	const candidates = [process.env['COMMITLINT_BASE'], 'origin/HEAD', 'main'];
	const base = candidates.find(
		(ref): ref is string => ref !== undefined && ref !== '' && refExists(ref),
	);

	if (base !== undefined) {
		try {
			return git(['merge-base', base, 'HEAD']);
		} catch {
			// no common ancestor — fall through to repo root
		}
	}

	// Fall back to the initial commit so commitlint still has a concrete starting ref.
	const [root] = git(['rev-list', '--max-parents=0', 'HEAD']).split('\n');
	if (root === undefined || root === '') throw new Error('no root commit found');
	return root;
}

const cliPkgPath = fileURLToPath(import.meta.resolve('@commitlint/cli/package.json'));
const bin = cliPkg.bin as string | Record<string, string>;
const binRel = typeof bin === 'string' ? bin : bin['commitlint'];
if (binRel === undefined || binRel === '')
	throw new Error('commitlint bin not found in its package.json');
const cliPath = join(dirname(cliPkgPath), binRel);

const from = resolveFrom();
const extraArgs = process.argv.slice(2);

const slot = Number(process.env['GIT_CONFIG_COUNT'] ?? 0);
const slotKey = String(slot);
const { status } = spawnSync(process.execPath, [cliPath, '--from', from, ...extraArgs], {
	stdio: 'inherit',
	env: {
		...process.env,
		GIT_CONFIG_COUNT: String(slot + 1),
		[`GIT_CONFIG_KEY_${slotKey}`]: 'log.showSignature',
		[`GIT_CONFIG_VALUE_${slotKey}`]: 'false',
	},
});

process.exit(status ?? 1);
