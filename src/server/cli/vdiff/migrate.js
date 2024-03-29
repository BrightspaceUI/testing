#!/usr/bin/env node
import { appendFile, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { join, normalize, parse } from 'node:path';
import commandLineArgs from 'command-line-args';
import { glob } from 'glob';
import { PATHS } from '../../visual-diff-plugin.js';
import { stdout } from 'node:process';

async function start(argv = [], local = false) {
	const { pattern = './**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true }, { partial: true, argv });
	const oldSuffix = local ? 'screenshots/golden' : 'screenshots/ci/golden';

	stdout.write(`\nMigrating goldens for pattern '${pattern}/${oldSuffix}'\n`);
	const dirs = await glob(`${pattern}/${oldSuffix}`, { ignore: 'node_modules/**', posix: true });
	let fileCount = 0;

	const gitignore = await readFile('.gitignore', { encoding: 'UTF8' }).catch(() => '');
	if (!new RegExp(`${PATHS.VDIFF_ROOT}/(\n|$)`).test(gitignore)) {
		const newline = gitignore.endsWith('\n') ? '' : '\n';
		await appendFile('.gitignore', `${newline}${PATHS.VDIFF_ROOT}/\n`);
	}

	await Promise.all(dirs.map(async dir => {
		const files = await glob(`${dir}/*/*.png`, { posix: true });

		await Promise.all(files.map(async file => {
			fileCount += 1;
			const { base: name, dir } = parse(file);
			const dirName = parse(dir).name;

			const newName = name
				.replace(/^d2l-/, '')
				.replace(new RegExp(`^${dirName}-`), '');

			const newDir = local ?
				`${PATHS.VDIFF_ROOT}/${dir.replace(`${oldSuffix}/${dirName}`, `${dirName}/${PATHS.GOLDEN}/chromium`)}` :
				dir.replace(`${oldSuffix}/${dirName}`, `${PATHS.GOLDEN}/${dirName}/chromium`);

			await mkdir(newDir, { recursive: true });
			return rename(file, join(newDir, newName));
		}));

		if (!local) {
			return rm(normalize(join(dir, '..', '..')), { recursive: true });
		}
	}));

	stdout.write(`\nMigrated ${fileCount} ${fileCount === 1 ? 'golden' : 'goldens'} found in ${dirs.length} test ${dirs.length === 1 ? 'directory' : 'directories'}\n`);
}

export const migrate = {
	start
};
