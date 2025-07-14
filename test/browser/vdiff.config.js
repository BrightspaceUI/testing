import { argv, env } from 'node:process';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PATHS } from '../../src/server/paths.js';
import { PNG } from 'pngjs';

const isCI = !!env['CI'];

function addDefaultGolden() {
	let rootDir;
	return {
		name: 'vdiff-add-default-golden-file',
		async serverStart({ config }) {
			rootDir = config.rootDir;
		},
		async executeCommand({ command, payload, session }) {
			if (command !== 'vdiff-add-default-golden-file') return;
			const browser = session.browser.name.toLowerCase();
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const filePath = join(rootDir, PATHS.VDIFF_ROOT, testPath);

			const defaultGoldenPath = join(filePath, payload.goldenTestCategory, PATHS.GOLDEN, browser, payload.goldenFileName);
			const testGoldenPath = join(filePath, payload.testCategory, PATHS.GOLDEN, browser, payload.fileName);

			await cp(defaultGoldenPath, testGoldenPath, { recursive: true });
			return true;
		}
	};
}

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

function removeTestFiles() {
	let rootDir;
	return {
		name: 'vdiff-remove-test-files',
		async serverStart({ config }) {
			rootDir = config.rootDir;
		},
		async executeCommand({ command, payload, session }) {
			if (command !== 'vdiff-remove-test-files') return;
			if (!isCI) return; // Leave files when running locally for debugging
			const browser = session.browser.name.toLowerCase();
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const filePath = join(rootDir, PATHS.VDIFF_ROOT, testPath, payload.testCategory);

			const goldenPath = join(filePath, PATHS.GOLDEN, browser, payload.fileName);
			const failedPath = join(filePath, PATHS.FAIL, browser, payload.fileName);

			await rm(goldenPath);
			await rm(failedPath);
			return true;
		}
	};
}

/*function revertGolden() {
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
}*/

export default {
	pattern: () => 'test/browser/**/*.vdiff.js',
	plugins: [addDefaultGolden(), getGoldenFlag(), modifyGolden(), removeTestFiles()]
};
