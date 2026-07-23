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

const remoteExists = (remote: string) => git(['remote']).split('\n').includes(remote);

function resolveRemoteDefault(remote: string): string {
	const output = git(['ls-remote', '--symref', remote, 'HEAD']);
	const branchMatch = /^ref: refs\/heads\/(.+)\tHEAD$/m.exec(output);
	const oidMatch = /^([0-9a-f]+)\tHEAD$/m.exec(output);
	if (branchMatch?.[1] === undefined || oidMatch?.[1] === undefined)
		throw new Error(`could not determine the default branch for remote '${remote}'`);

	const ref = `refs/remotes/${remote}/${branchMatch[1]}`;
	if (!refExists(ref))
		throw new Error(
			`remote default branch '${remote}/${branchMatch[1]}' is not fetched; run 'git fetch ${remote}'`,
		);
	if (git(['rev-parse', ref]) !== oidMatch[1])
		throw new Error(
			`remote default branch '${remote}/${branchMatch[1]}' is stale; run 'git fetch ${remote}'`,
		);
	return ref;
}

function mergeBase(base: string): string {
	try {
		return git(['merge-base', base, 'HEAD']);
	} catch (error) {
		throw new Error(`could not find a common ancestor between '${base}' and HEAD`, {
			cause: error,
		});
	}
}

interface CommitRange {
	from: string;
	includeFrom: boolean;
}

function resolveRange(): CommitRange {
	const fromEnv = process.env['COMMITLINT_FROM'];
	if (fromEnv !== undefined && fromEnv !== '') return { from: fromEnv, includeFrom: false };

	const baseEnv = process.env['COMMITLINT_BASE'];
	if (baseEnv !== undefined && baseEnv !== '') {
		if (!refExists(baseEnv)) throw new Error(`base ref '${baseEnv}' does not exist`);
		return { from: mergeBase(baseEnv), includeFrom: false };
	}

	if (remoteExists('origin'))
		return { from: mergeBase(resolveRemoteDefault('origin')), includeFrom: false };

	const localBase = ['main', 'master'].find(refExists);
	if (localBase !== undefined) return { from: mergeBase(localBase), includeFrom: false };

	const [root] = git(['rev-list', '--max-parents=0', 'HEAD']).split('\n');
	if (root === undefined || root === '') throw new Error('no root commit found');
	return { from: root, includeFrom: true };
}

const cliPkgPath = fileURLToPath(import.meta.resolve('@commitlint/cli/package.json'));
const bin = cliPkg.bin as string | Record<string, string>;
const binRel = typeof bin === 'string' ? bin : bin['commitlint'];
if (binRel === undefined || binRel === '')
	throw new Error('commitlint bin not found in its package.json');
const cliPath = join(dirname(cliPkgPath), binRel);

const slot = Number(process.env['GIT_CONFIG_COUNT'] ?? 0);
const slotKey = String(slot);
const env = {
	...process.env,
	GIT_CONFIG_COUNT: String(slot + 1),
	[`GIT_CONFIG_KEY_${slotKey}`]: 'log.showSignature',
	[`GIT_CONFIG_VALUE_${slotKey}`]: 'false',
};

function lint(args: string[], input?: string): number {
	const { error, signal, status } = spawnSync(process.execPath, [cliPath, ...args], {
		stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'],
		env,
		input,
	});
	if (error !== undefined) throw error;
	if (signal !== null) throw new Error(`commitlint terminated by signal ${signal}`);
	if (status === null) throw new Error('commitlint exited without a status');
	return status;
}

const range = resolveRange();
const extraArgs = process.argv.slice(2);
let status = 0;

if (range.includeFrom) {
	const message = git(['show', '--no-show-signature', '-s', '--format=%B', range.from]);
	status = lint(extraArgs, `${message}\n`);
}

const rangeStatus = lint(['--from', range.from, ...extraArgs]);
if (status === 0) status = rangeStatus;
process.exit(status);
