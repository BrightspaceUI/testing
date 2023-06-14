#!/usr/bin/env node
import { access, mkdir, rename } from 'node:fs/promises';
import { join, normalize, sep } from 'path';
import { glob } from 'glob';
import commandLineArgs from 'command-line-args';

let { pattern = './test/**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true });
pattern = pattern.replace(/^'|'$/g, '');

const oldSuffix = 'screenshots/ci/golden';
const newSuffix = 'vdiff/ci/chromium/golden';
const dirs = await glob(`${pattern}/${oldSuffix}`, { ignore: 'node_modules/**' });
const files = [];

await Promise.all(dirs.map(async dir => {
	files.push(...(await glob(`${dir.replaceAll(sep, '/')}/*/*.png`)));

	const base = dir.replace(normalize(oldSuffix), '');

	await access(join(base, 'vdiff')).catch(async err => err && await mkdir(join(base, 'vdiff')));
	await access(join(base, 'vdiff', 'ci')).catch(async err => err && await mkdir(join(base, 'vdiff', 'ci')));
	await access(join(base, 'vdiff', 'ci', 'chromium')).catch(async err => err && await mkdir(join(base, 'vdiff', 'ci', 'chromium')));
	return rename(dir, join(base, normalize(newSuffix)));
}));

console.log(`Migrated ${files.length} goldens found in ${dirs.length} test directories`);
