import { argv, env } from 'node:process';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PATHS } from '../../src/server/paths.js';
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

function revertGolden() {
	let rootDir;
	return {
		name: 'vdiff-revert-golden-file',
		async serverStart({ config }) {
			rootDir = config.rootDir;
		},
		async executeCommand({ command, payload, session }) {
			if (command !== 'vdiff-revert-golden-file') return;
			const browser = session.browser.name.toLowerCase();
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const filePath = join(rootDir, PATHS.VDIFF_ROOT, testPath, payload.testCategory);

			const failedPath = join(filePath, PATHS.FAIL, browser, payload.fileName);
			const goldenPath = join(filePath, PATHS.GOLDEN, browser, payload.fileName);

			await copyFile(goldenPath, failedPath, 2);
			return true;
		}
	};
}

export default {
	pattern: () => 'test/browser/**/*.vdiff.js',
	plugins: [getGoldenFlag(), modifyGolden(), revertGolden()]
};
