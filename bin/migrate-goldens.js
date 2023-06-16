#!/usr/bin/env node
import { join, normalize, parse, sep } from 'path';
import { mkdir, rename, rm } from 'node:fs/promises';
import commandLineArgs from 'command-line-args';
import { glob } from 'glob';
import { stdout } from 'node:process';

const { pattern = './test/**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true }, { partial: true });
const oldSuffix = 'screenshots/ci/golden';
const newSuffix = 'golden/chromium';
const dirs = await glob(`${pattern}/${oldSuffix}`, { ignore: 'node_modules/**' });
let fileCount = 0;

await Promise.all(dirs.map(async dir => {
	const files = await glob(`${dir.replaceAll(sep, '/')}/*/*.png`);
	const base = dir.replace(normalize(oldSuffix), '');

	await mkdir(join(base, normalize(newSuffix)), { recursive: true });

	await Promise.all(files.map(async file => {
		fileCount += 1;
		const { base: name, dir } = parse(file);
		const dirName = parse(dir).name;
		const newName = name.replace(/^d2l-/, '').replace(new RegExp(`^${dirName}-`), '');
		await mkdir(join(base, normalize(newSuffix), dirName), { recursive: true });
		return rename(file, join(base, normalize(newSuffix), dirName, newName));
	}));
	return rm(normalize(join(dir, '..', '..')), { recursive: true });
}));

stdout.write(`\nMigrated ${fileCount} ${fileCount === 1 ? 'golden' : 'goldens'} found in ${dirs.length} test ${dirs.length === 1 ? 'directory' : 'directories'}\n`);
