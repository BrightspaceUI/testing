import { argv, env } from 'node:process';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { PATHS } from '../../src/server/visual-diff-plugin.js';
import { PNG } from 'pngjs';

const isCI = !!env['CI'];

function getGoldenFlag() {
	return {
		name: 'vdiff-get-golden-flag',
		async executeCommand({ command }) {
			if (command !== 'vdiff-get-golden-flag') return;
			return argv.indexOf('--golden') > -1;
		}
	};
}

function modifyGolden() {
	let rootDir;
	return {
		name: 'vdiff-modify-golden-file',
		async serverStart({ config }) {
			rootDir = config.rootDir;
		},
		async executeCommand({ command, payload, session }) {
			if (command !== 'vdiff-modify-golden-file') return;
			const browser = session.browser.name.toLowerCase();
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const filePath = join(rootDir, PATHS.VDIFF_ROOT, testPath, payload.testCategory);
			const fileLocation = isCI ? PATHS.FAIL : PATHS.GOLDEN;

			const fullPath = join(filePath, fileLocation, browser, payload.fileName);
			const data = await readFile(fullPath);
			const png = PNG.sync.read(data);
			const buffer = PNG.sync.write(png, { inputHasAlpha: false });
			await writeFile(fullPath, buffer);
			return true;
		}
	};
}

export default {
	pattern: () => 'test/browser/**/*.vdiff.js',
	plugins: [getGoldenFlag(), modifyGolden()]
};
