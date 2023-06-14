#!/usr/bin/env node
import { join, normalize, sep } from 'path';
import { mkdir, rename } from 'node:fs/promises';
import commandLineArgs from 'command-line-args';
import { glob } from 'glob';
import { stdout } from 'node:process';

const { pattern = './test/**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true }, { partial: true });
const oldSuffix = 'screenshots/ci/golden';
const newSuffix = 'vdiff/ci/chromium/golden';
const dirs = await glob(`${pattern}/${oldSuffix}`, { ignore: 'node_modules/**' });
const files = [];

await Promise.all(dirs.map(async dir => {
	files.push(...(await glob(`${dir.replaceAll(sep, '/')}/*/*.png`)));

	const base = dir.replace(normalize(oldSuffix), '');

	await mkdir(join(base, 'vdiff', 'ci', 'chromium'), { recursive: true });
	return rename(dir, join(base, normalize(newSuffix)));
}));

stdout.write(`\nMigrated ${files.length} ${files.length === 1 ? 'golden' : 'goldens'} found in ${dirs.length} test ${dirs.length === 1 ? 'directory' : 'directories'}\n`);
