#!/usr/bin/env node
import { mkdir, rename } from 'node:fs/promises';
import { join, normalize, sep } from 'path';
import { glob } from 'glob';
import commandLineArgs from 'command-line-args';

const { pattern = './test/**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true }, { partial: true });
console.log(pattern);
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

console.log(`Migrated ${files.length} goldens found in ${dirs.length} test directories`);
