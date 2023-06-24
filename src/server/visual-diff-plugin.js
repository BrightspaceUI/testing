import { access, constants, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { env } from 'node:process';

const isCI = !!env['CI'];
const DEFAULT_MARGIN = 10;
const PATHS = {
	FAIL: 'fail',
	GOLDEN: 'golden',
	PASS: 'pass',
	VDIFF_ROOT: '.vdiff'
};

async function checkFileExists(fileName) {
	try {
		await access(fileName, constants.F_OK);
		return true;
	} catch (e) {
		return false;
	}
}

async function clearDir(updateGoldens, path) {
	if (updateGoldens) {
		await rm(path, { force: true, recursive: true });
	} else {
		await Promise.all([
			rm(join(path, PATHS.FAIL), { force: true, recursive: true }),
			rm(join(path, PATHS.PASS), { force: true, recursive: true }),
			rm(join(path, 'report.html'), { force: true })
		]);
	}
}

async function clearAllDirs(updateGoldens, vdiffPath) {
	if (updateGoldens) {
		await rm(vdiffPath, { force: true, recursive: true });
	} else {
		await clearDiffPaths(vdiffPath);
	}
}

async function clearDiffPaths(dir) {
	const paths = await readdir(dir, { withFileTypes: true });
	for (const path of paths) {
		const full = join(dir, path.name);
		const base = basename(path.name);

		if (path.isDirectory()) {
			if (base === PATHS.PASS || base === PATHS.FAIL) await rm(full, { force: true, recursive: true });
			else await clearDiffPaths(full);
		} else {
			if (base === 'report.html') await rm(full, { force: true });
		}
	}
}

async function tryMoveFile(srcFileName, destFileName) {
	await mkdir(dirname(destFileName), { recursive: true });
	try {
		await rename(srcFileName, destFileName);
		return true;
	} catch (e) {
		console.warn(e);
		return false;
	}
}

function extractTestPartsFromName(name) {
	name = name.toLowerCase();
	const parts = name.split(' ');
	if (parts.length > 1) {
		let dirName = parts.shift();
		if (dirName.startsWith('d2l-')) {
			dirName = dirName.substring(4);
		}
		return {
			dir: dirName,
			newName: parts.join('-')
		};
	}
	return {
		dir: '',
		newName: parts.join('-')
	};
}

export function visualDiff({ updateGoldens = false, runSubset = false } = {}) {
	let currentRun = 0,
		rootDir;
	const clearedDirs = new Map();
	return {
		name: 'brightspace-visual-diff',
		async serverStart({ config }) {
			rootDir = config.rootDir;

			if (runSubset || isCI) return;
			// Do a more complete cleanup to remove orphaned directories
			await clearAllDirs(updateGoldens, join(rootDir, PATHS.VDIFF_ROOT));
		},
		async executeCommand({ command, payload, session }) {

			if (command !== 'brightspace-visual-diff') {
				return;
			}
			if (session.browser.type !== 'playwright') {
				throw new Error('Visual-diff is only supported for browser type Playwright.');
			}

			const browser = session.browser.name.toLowerCase();
			const { dir, newName } = extractTestPartsFromName(payload.name);
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const newPath = join(rootDir, PATHS.VDIFF_ROOT, testPath, dir);
			const goldenFileName = `${join(newPath, PATHS.GOLDEN, browser, newName)}.png`;
			const passFileName = `${join(newPath, PATHS.PASS, browser, newName)}.png`;
			const screenshotFileName = `${join(newPath, PATHS.FAIL, browser, newName)}.png`;

			if (!isCI) { // CI will be a fresh .vdiff folder each time and only one run
				if (session.testRun !== currentRun) {
					currentRun = session.testRun;
					clearedDirs.clear();
				}

				if (runSubset || currentRun > 0) {
					if (!clearedDirs.has(newPath)) {
						clearedDirs.set(newPath, clearDir(updateGoldens, newPath));
					}
					await clearedDirs.get(newPath);
				}
			}

			const opts = { margin: DEFAULT_MARGIN, ...payload.opts };

			const page = session.browser.getPage(session.id);
			await page.screenshot({
				animations: 'disabled',
				clip: {
					x: payload.rect.x - opts.margin,
					y: payload.rect.y - opts.margin,
					width: payload.rect.width + (opts.margin * 2),
					height: payload.rect.height + (opts.margin * 2)
				},
				path: updateGoldens ? goldenFileName : screenshotFileName
			});

			if (updateGoldens) {
				return { pass: true };
			}

			const goldenExists = await checkFileExists(goldenFileName);
			if (!goldenExists) {
				return { pass: false, message: 'No golden exists. Use the "--golden" CLI flag to re-run and re-generate goldens.' };
			}

			const screenshotInfo = await stat(screenshotFileName);
			const goldenInfo = await stat(goldenFileName);

			// TODO: obviously this isn't how to diff against the golden! Use pixelmatch here.
			const same = (screenshotInfo.size === goldenInfo.size);

			if (same) {
				const success = await tryMoveFile(screenshotFileName, passFileName);
				if (!success) return { pass: false, message: 'Problem moving file to pass directory.' };
			}
			return { pass: same, message: 'Does not match golden.' }; // TODO: Add more details once actually diff-ing

		}
	};
}
