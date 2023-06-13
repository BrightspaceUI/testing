#!/usr/bin/env node
import { access, mkdir, rename } from 'node:fs/promises';
import { glob } from 'glob';
import commandLineArgs from 'command-line-args';

const { pattern = './test/**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true });
const oldSuffix = '/screenshots/ci/golden';
const newSuffix = '/vdiff/ci/chromium/golden';

const dirs = await glob(`${pattern}${oldSuffix}`, { ignore: 'node_modules/**' });

const files = [];

await Promise.all(dirs.map(async dir => {
	files.push(...(await glob(`${dir}/*/*.png`)));

	const base = dir.replace(oldSuffix, '');

	await access(`${base}/vdiff`).catch(async err => err && await mkdir(`${base}/vdiff`));
	await access(`${base}/vdiff/ci`).catch(async err => err && await mkdir(`${base}/vdiff/ci`));
	await access(`${base}/vdiff/ci/chromium`).catch(async err => err && await mkdir(`${base}/vdiff/ci/chromium`));
	return rename(dir, `${base}/${newSuffix}`);
}));

console.log(`Migrated ${files.length} goldens found in ${dirs.length} test directories`);
