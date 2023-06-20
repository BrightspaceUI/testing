import { basename, dirname, join } from 'path';
import { readdirSync, rmSync } from 'node:fs';

function getDiffPaths(dir, _diffPaths) {
	_diffPaths = _diffPaths || [];
	const paths = readdirSync(dir, { withFileTypes: true });
	paths.forEach(path => {
		const full = join(dir, path.name);
		const base = basename(path.name);

		if (path.isDirectory()) {
			if (base === 'pass' || base === 'fail') _diffPaths.push(full);
			getDiffPaths(full, _diffPaths);
		} else {
			if (base === 'report.json') _diffPaths.push(full);
		}
	});
	return _diffPaths;
}

function cleanupFiles(rootDir, testFiles, updateGoldens, runSubset) {
	const vdiffDir = join(rootDir, '.vdiff');
	let pathsToClear = [];

	if (runSubset) {
		const pathSet = new Set();
		testFiles.forEach(file => {
			const testPath = dirname(file).replace(rootDir, '');
			pathSet.add(join(vdiffDir, testPath));
		});

		if (updateGoldens) {
			pathsToClear = Array.from(pathSet);
		} else {
			pathSet.forEach(path => {
				const nestedPaths = getDiffPaths(path);
				pathsToClear = pathsToClear.concat(nestedPaths);
			});
		}
	} else {
		if (updateGoldens) {
			pathsToClear.push(vdiffDir);
		} else {
			pathsToClear = getDiffPaths(vdiffDir);
		}
	}

	pathsToClear.forEach(path => rmSync(path, { force: true, recursive: true }));
}

export function visualDiffReporter({ updateGoldens = false, runSubset = false } = {}) {
	let rootDir, allTestFiles;
	return {
		/**
		 * Called once when the test runner starts.
		 */
		start({ config, testFiles }) {
			rootDir = config.rootDir;
			allTestFiles = testFiles;
			// onTestRunStarted doesn't run the first time, so need to do this here as well until that's fixed
			cleanupFiles(rootDir, allTestFiles, updateGoldens, runSubset);
		},

		/**
		 * Called when a test run starts (but not the first time - https://github.com/modernweb-dev/web/issues/2067).
		 * Each file change in watch mode triggers a test run.
		 *
		 * @param testRun the test run
		 */
		async onTestRunStarted() {
			await cleanupFiles(rootDir, allTestFiles, updateGoldens, runSubset);
		}
	};
}
