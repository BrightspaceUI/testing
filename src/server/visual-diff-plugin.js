import { access, constants, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { env } from 'node:process';
import { PATHS } from './paths.js';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { TestInfoManager } from './visual-diff-info.js';

const isCI = !!env['CI'];
const DEFAULT_TOLERANCE = 0; // TODO: Support tolerance override?

const ALT_TESTS = {
	dark: {
		set() {
			document.documentElement.setAttribute('data-color-mode', 'dark');
		},
		reset() {
			document.documentElement.removeAttribute('data-color-mode');
		}
	}
};

const ERROR_MESSAGES = {
	noGolden: 'No golden exists. Use the "--golden" CLI flag to re-run and re-generate goldens.',
	moveFile: 'Problem moving file to "pass" directory.',
	pixelDiff: (pixelsDiff) => `Image does not match golden. ${pixelsDiff} pixels are different.`,
	byteDiff: 'Image diff is clean but the images do not have the same bytes.',
	resizeDiff: (bestPixelsDiff) => `Images are not the same size. When resized, ${bestPixelsDiff} pixels are different.`
};

async function checkFileExists(fileName) {
	try {
		await access(fileName, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

async function clearDir(updateGoldens, path) {
	if (updateGoldens) {
		await rm(path, { force: true, recursive: true });
	} else {
		await Promise.all([
			rm(join(path, PATHS.FAIL), { force: true, recursive: true }),
			rm(join(path, PATHS.PASS), { force: true, recursive: true })
		]);
	}
}

async function clearAllDirs(updateGoldens, vdiffPath) {
	if (updateGoldens) {
		await rm(vdiffPath, { force: true, recursive: true });
	} else {
		const exists = await checkFileExists(vdiffPath);
		if (exists) await clearDiffPaths(vdiffPath);
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
		}
	}
}

function getResizedPng(xName, yName, original, newSize) {
	const xOffsets = {
		left: 0,
		center: Math.floor((newSize.width - original.width) / 2),
		right: newSize.width - original.width
	};
	const yOffsets = {
		top: 0,
		center: Math.floor((newSize.height - original.height) / 2),
		bottom: newSize.height - original.height
	};
	const resized = new PNG(newSize);
	PNG.bitblt(original, resized, 0, 0, original.width, original.height, xOffsets[xName], yOffsets[yName]);
	return resized;
}

async function createComparisonPNGs(original, newSize) {
	const resizedPNGs = [];
	[ 'top', 'center', 'bottom' ].forEach(y => {
		['left', 'center', 'right'].forEach(x => {
			if (original.width === newSize.width && original.height === newSize.height) {
				resizedPNGs.push({ png: original, position: `${y}-${x}` });
			} else {
				const resized = getResizedPng(x, y, original, newSize);
				resizedPNGs.push({ png: resized, position: `${y}-${x}` });
			}
		});
	});

	return resizedPNGs;
}

function getPixelsDiff(screenshotImage, goldenImage) {
	const diff = new PNG({ width: screenshotImage.width, height: screenshotImage.height });
	const pixelsDiff = pixelmatch(
		screenshotImage.data, goldenImage.data, diff.data, screenshotImage.width, screenshotImage.height, { diffMask: true, threshold: DEFAULT_TOLERANCE }
	);
	return { diff, pixelsDiff };
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
	const parts = name.split(/[\s*"/\\<>:|?]/);
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
			const infoManager = new TestInfoManager(session, payload.name);

			if (session.browser.type !== 'playwright') {
				throw new Error('Visual-diff is only supported for browser type Playwright.');
			}

			const browser = session.browser.name.toLowerCase();
			const { dir, newName } = extractTestPartsFromName(payload.name);
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const newPath = join(rootDir, PATHS.VDIFF_ROOT, testPath, dir);
			const goldenFile = join(newPath, PATHS.GOLDEN, browser, newName);
			const passFile = join(newPath, PATHS.PASS, browser, newName);
			const screenshotFile = join(newPath, PATHS.FAIL, browser, newName);
			function getFileName(base, alt = 'default') {
				return `${base}${alt === 'default' ? '' : `.${alt}`}.png`;
			}
			const tests = ['default', ...(payload.altTests || [])];
			const rootLength = join(rootDir, PATHS.VDIFF_ROOT).length + 1;

			if (command === 'brightspace-visual-diff-compare') {
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

				const screenshotOpts = {
					animations: 'disabled'
				};

				if (payload.fullPage) screenshotOpts.fullPage = true;
				if (payload.rect) screenshotOpts.clip = payload.rect;

				const page = session.browser.getPage(session.id);
				async function takeScreenshot(alt = 'default') {
					const path = getFileName(updateGoldens ? goldenFile : screenshotFile, alt);
					if (alt !== 'default') page.evaluate(ALT_TESTS[alt].set);
					const screenshot = await page.screenshot({ path, ...screenshotOpts });
					if (alt !== 'default') page.evaluate(ALT_TESTS[alt].reset);
					return screenshot;
				}

				const screenshotFileBuffers = {};
				for (const test of tests) screenshotFileBuffers[test] = await takeScreenshot(test);

				if (updateGoldens) {
					return { pass: true };
				}

				let resizeRequired = false;
				let pass = true;
				let errors = '';
				async function runCompareTest(alt = 'default') {
					const screenshotFileName = getFileName(screenshotFile, alt);
					const goldenFileName = getFileName(goldenFile, alt);
					const passFileName = getFileName(passFile, alt);

					const screenshotImage = PNG.sync.read(screenshotFileBuffers[alt]);
					infoManager.set({
						slowDuration: payload.slowDuration,
						new: {
							height: screenshotImage.height,
							path: screenshotFileName.substring(rootLength),
							width: screenshotImage.width
						}
					}, alt);

					const goldenExists = await checkFileExists(goldenFileName);
					if (!goldenExists) {
						return { pass: false, message: ERROR_MESSAGES.noGolden };
					}

					const goldenFileBuffer = await readFile(goldenFileName);
					const goldenImage = PNG.sync.read(goldenFileBuffer);
					infoManager.set({
						golden: {
							height: goldenImage.height,
							path: goldenFileName.substring(rootLength),
							width: goldenImage.width
						}
					}, alt);

					if (resizeRequired) {
						return { resizeRequired: true }; // If any test requires a resize, assume alt tests will too
					}

					if (screenshotImage.width === goldenImage.width && screenshotImage.height === goldenImage.height) {
						const goldenSize = (await stat(goldenFileName)).size;
						const screenshotSize = (await stat(screenshotFileName)).size;
						if (goldenSize === screenshotSize && screenshotFileBuffers[alt].equals(goldenFileBuffer)) {
							const success = await tryMoveFile(screenshotFileName, passFileName);
							if (!success) return { pass: false, message: ERROR_MESSAGES.moveFile };
							infoManager.set({
								new: {
									path: passFileName.substring(rootLength)
								}
							}, alt);
							return { pass: true };
						}

						const { diff, pixelsDiff } = getPixelsDiff(screenshotImage, goldenImage);

						if (pixelsDiff !== 0) {
							infoManager.set({
								diff: `${screenshotFile.substring(rootLength)}-diff.png`,
								pixelsDiff
							}, alt);
							await writeFile(`${screenshotFile}-diff.png`, PNG.sync.write(diff));
							return { pass: false, message: ERROR_MESSAGES.pixelDiff(pixelsDiff) };
						} else {
							infoManager.set({
								golden: {
									byteSize: goldenSize
								},
								new: {
									byteSize: screenshotSize
								},
								pixelsDiff
							}, alt);
							return { pass: false, message: ERROR_MESSAGES.byteDiff };
						}
					} else {
						return { resizeRequired: true };
					}
				}

				const testResults = {};
				for (const test of tests) {
					testResults[test] = await runCompareTest(test);
					if (testResults[test].resizeRequired) resizeRequired = true;
					else if (!testResults[test].pass) {
						pass = false;
						errors += `(${test}) ${testResults[test].message}\n`;
					}
				}
				if (resizeRequired) return { resizeRequired: true };
				else if (pass) return { pass: true };
				else if (tests.length === 1) return testResults[tests[0]];
				else return { pass: false, message: `One or more tests failed:${errors}` };
			} else if (command === 'brightspace-visual-diff-compare-resize') {
				let message = 'One or more tests failed:';
				const info = infoManager.get() || {};
				const resizeTests = [];
				for (const test of tests) {
					if (!info[test]['golden']) {
						message += `\n(${test}) ${ERROR_MESSAGES.noGolden}`;
					} else {
						resizeTests.push(test);
					}
				}

				async function readPNG(path, alt) {
					return PNG.sync.read(await readFile(getFileName(path, alt)));
				}

				const screenshotImage = await readPNG(screenshotFile, resizeTests[0]);
				const goldenImage = await readPNG(goldenFile, resizeTests[0]);

				const newWidth = Math.max(screenshotImage.width, goldenImage.width);
				const newHeight = Math.max(screenshotImage.height, goldenImage.height);
				const newSize = { width: newWidth, height: newHeight };

				const newScreenshots = await createComparisonPNGs(screenshotImage, newSize);
				const newGoldens = await createComparisonPNGs(goldenImage, newSize);

				let bestIndex = -1;
				let bestDiffImage = null;
				let bestPixelsDiff = Number.MAX_SAFE_INTEGER;
				for (let i = 0; i < newScreenshots.length; i++) {
					const { diff, pixelsDiff } = getPixelsDiff(newScreenshots[i].png, newGoldens[i].png);

					if (pixelsDiff < bestPixelsDiff) {
						bestIndex = i;
						bestDiffImage = diff;
						bestPixelsDiff = pixelsDiff;
					}
				}
				const bestPosition = newScreenshots[bestIndex].position.split('-');

				async function runResizeTest(alt) {
					const paths = {
						screenshot: getFileName(`${screenshotFile}-resized-screenshot`, alt),
						golden: getFileName(`${screenshotFile}-resized-golden`, alt),
						diff: getFileName(`${screenshotFile}-diff`, alt)
					};
					let screenshotPNG = newScreenshots[bestIndex].png;
					let goldenPNG = newGoldens[bestIndex].png;
					let diff = bestDiffImage;
					let pixelsDiff = bestPixelsDiff;
					if (alt !== resizeTests[0]) {
						screenshotPNG = getResizedPng(bestPosition[1], bestPosition[0], await readPNG(screenshotFile, alt), newSize);
						goldenPNG = getResizedPng(bestPosition[1], bestPosition[0], await readPNG(goldenFile, alt), newSize);
						const newDiffs = getPixelsDiff(screenshotPNG, goldenPNG);
						diff = newDiffs.diff;
						pixelsDiff = newDiffs.pixelsDiff;
					}

					await writeFile(paths.screenshot, PNG.sync.write(screenshotPNG));
					await writeFile(paths.golden, PNG.sync.write(goldenPNG));
					await writeFile(paths.diff, PNG.sync.write(diff));
					infoManager.set({
						diff: paths.diff.substring(rootLength),
						golden: {
							path: paths.golden.substring(rootLength)
						},
						new: {
							path: paths.screenshot.substring(rootLength)
						},
						pixelsDiff
					}, alt);
					return pixelsDiff;
				}

				const resizeResults = {};
				for (const test of resizeTests) {
					resizeResults[test] = runResizeTest(test);
				}
				await Promise.all(Object.values(resizeResults));

				if (tests.length === 1) message = ERROR_MESSAGES.resizeDiff(await resizeResults[resizeTests[0]]);
				else {
					for (const test of resizeTests) {
						message += `\n(${test}) ${ERROR_MESSAGES.resizeDiff(await resizeResults[test])}`;
					}
				}
				return { pass: false, message };

			}

		}
	};
}
