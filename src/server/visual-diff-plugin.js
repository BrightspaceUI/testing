//@ts-check
import { access, constants, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { env } from 'node:process';
import { PATHS } from './paths.js';
import pixelmatch from 'pixelmatch';
import { PlaywrightLauncher } from '@web/test-runner-playwright';
import { PNG } from 'pngjs';
import { TestInfoManager } from './vdiff-test-info.js';

const isCI = !!env['CI'];
const DEFAULT_TOLERANCE = 0; // TODO: Support tolerance override?

/**@param {string} fileName */
async function checkFileExists(fileName) {
	try {
		await access(fileName, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}
/**
 * @param {boolean} updateGoldens
 * @param {string} path
 */
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
/**
 * @param {boolean} updateGoldens
 * @param {string} vdiffPath
 */
async function clearAllDirs(updateGoldens, vdiffPath) {
	if (updateGoldens) {
		await rm(vdiffPath, { force: true, recursive: true });
	} else {
		const exists = await checkFileExists(vdiffPath);
		if (exists) await clearDiffPaths(vdiffPath);
	}
}

/**@param {string} dir */
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

/**
 * @param {string} xName
 * @param {string} yName
 * @param {import('pngjs').PNGWithMetadata} original
 * @param {{width: number, height: number}} newSize
 */
function getResizedPng(xName, yName, original, newSize) {

	let x = 0;
	let y = 0;

	if (xName === 'center') {
		x = Math.floor((newSize.width - original.width) / 2);
	} else if (xName === 'right') {
		x = newSize.width - original.width;
	}

	if (yName === 'center') {
		y = Math.floor((newSize.height - original.height) / 2);
	} else if (yName === 'bottom') {
		y = newSize.height - original.height;
	}

	const resized = new PNG(newSize);
	PNG.bitblt(original, resized, 0, 0, original.width, original.height, x, y);
	return resized;
}

/**
 * @param {import('pngjs').PNGWithMetadata} original
 * @param {{width: number, height: number}} newSize
 */
async function createComparisonPNGs(original, newSize) {
	/**@type {Array<{png: PNG, position: string}>} */
	const resizedPNGs = [];
	[ 'top', 'center', 'bottom' ].forEach(y => {
		['left', 'center', 'right'].forEach(x => { // TODO: position added for reports, remove/adjust as needed
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

/**
 * @param {PNG} screenshotImage
 * @param {PNG} goldenImage
 */
function getPixelsDiff(screenshotImage, goldenImage) {
	const diff = new PNG({ width: screenshotImage.width, height: screenshotImage.height });
	const pixelsDiff = pixelmatch(
		screenshotImage.data, goldenImage.data, diff.data, screenshotImage.width, screenshotImage.height, { diffMask: true, threshold: DEFAULT_TOLERANCE }
	);
	return { diff, pixelsDiff };
}

/**
 * @param {string} srcFileName
 * @param {string} destFileName
 */
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

/**@param {string} name */
function extractTestPartsFromName(name) {
	name = name.toLowerCase();
	const parts = name.split(/[\s*"/\\<>:|?]/);
	if (parts.length > 1) {
		let dirName = parts.shift() || '';
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
/**  @enum {string} */
const FAILED_TEST = {
	MISSING_GOLDEN: 'No golden exists. Use the "--golden" CLI flag to re-run and re-generate goldens.',
	DIFF: 'Image does not match golden.',
	RESIZE: 'Images are not the same size.',
	BYTES: 'Image diff is clean but the images do not have the same bytes.',
	MOVE_FAILURE: 'Problem moving file to "pass" directory.'
};

/**
 * @param {TestInfoManager} infoManager
 * @param {string} screenshotPath
 * @param {string} goldenPath
 * @param {string} passPath
 * @param {number} rootLength
 * @param {string} [alt]
 * @returns {Promise<FAILED_TEST | null>}
 */
async function runTest(infoManager, screenshotPath, goldenPath, passPath, rootLength, alt) {
	const suffix = alt ? `.${alt}` : '';
	const screenshotFileName = `${screenshotPath}${suffix}.png`;
	const diffFileName = `${screenshotPath}-diff${suffix}.png`;
	const goldenFileName = `${goldenPath}${suffix}.png`;
	const passFileName = `${passPath}${suffix}.png`;

	const screenshotFileBuffer = await readFile(screenshotFileName);
	const screenshotImage = PNG.sync.read(screenshotFileBuffer);
	infoManager.set({
		new: {
			height: screenshotImage.height,
			path: `${screenshotPath.substring(rootLength)}.png`,
			width: screenshotImage.width
		}
	}, alt);
	const goldenExists = await checkFileExists(goldenFileName);
	if (!goldenExists) return FAILED_TEST.MISSING_GOLDEN;

	const goldenFileBuffer = await readFile(goldenFileName);
	const goldenImage = PNG.sync.read(goldenFileBuffer);
	infoManager.set({
		golden: {
			height: goldenImage.height,
			path: `${goldenFileName.substring(rootLength)}`,
			width: goldenImage.width
		}
	}, alt);
	if (screenshotImage.width !== goldenImage.width || screenshotImage.height !== goldenImage.height)
		return FAILED_TEST.RESIZE;
	const goldenSize = (await stat(goldenFileName)).size;
	const screenshotSize = (await stat(screenshotFileName)).size;
	if (goldenSize === screenshotSize && screenshotFileBuffer.equals(goldenFileBuffer)) {
		const success = await tryMoveFile(screenshotFileName, passFileName);
		if (!success) return FAILED_TEST.MOVE_FAILURE;
		infoManager.set({
			new: {
				path: passFileName.substring(rootLength)
			}
		});
		return null;
	}

	const { diff, pixelsDiff } = getPixelsDiff(screenshotImage, goldenImage);

	if (pixelsDiff !== 0) {
		infoManager.set({
			diff: diffFileName.substring(rootLength),
			pixelsDiff
		});
		await writeFile(diffFileName, PNG.sync.write(diff));
		return `Image does not match golden. ${pixelsDiff} pixels are different.`;
	} else {
		infoManager.set({
			golden: {
				byteSize: goldenSize
			},
			new: {
				byteSize: screenshotSize
			},
			pixelsDiff
		});
		return FAILED_TEST.BYTES;
	}
}

/**
 * @typedef {Object} TestPayload
 * @property {string} name
 * @property {boolean} [fullPage]
 * @property {{ x: number, y: number, width: number, height: number }} [rect]
 * @property {number} [slowDuration]
 */
/**@return {import('@web/test-runner').TestRunnerPlugin<TestPayload>} */
export function visualDiff({ updateGoldens = false, runSubset = false } = {}) {
	let currentRun = 0,
		/**@type {string} */ rootDir;
	const clearedDirs = new Map();
	return {
		name: 'brightspace-visual-diff',
		async serverStart({ config }) {
			rootDir = /**@type {string}*/(config.rootDir);

			if (runSubset || isCI) return;
			// Do a more complete cleanup to remove orphaned directories
			await clearAllDirs(updateGoldens, join(rootDir, PATHS.VDIFF_ROOT));
		},
		/**@param {{ command: string, payload: TestPayload, session: import('@web/test-runner').TestSession }} param0 */
		async executeCommand({ command, payload, session }) {

			if (!(session.browser instanceof PlaywrightLauncher)) {
				throw new Error('Visual-diff is only supported for browser type Playwright.');
			}

			const browser = session.browser.name.toLowerCase();
			const { dir, newName } = extractTestPartsFromName(payload.name);
			const testPath = dirname(session.testFile).replace(rootDir, '');
			const newPath = join(rootDir, PATHS.VDIFF_ROOT, testPath, dir);
			const goldenFile = join(newPath, PATHS.GOLDEN, browser, newName);
			const passFile = join(newPath, PATHS.PASS, browser, newName);
			const screenshotFile = join(newPath, PATHS.FAIL, browser, newName);
			const rootLength = join(rootDir, PATHS.VDIFF_ROOT).length + 1;
			const infoManager = new TestInfoManager(session, payload.name);

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

				/**@type {import('playwright').PageScreenshotOptions} */
				const screenshotOpts = {
					animations: 'disabled',
					path: `${updateGoldens ? goldenFile : screenshotFile}.png`
				};

				if (payload.fullPage) screenshotOpts.fullPage = true;
				if (payload.rect) screenshotOpts.clip = payload.rect;

				const page = session.browser.getPage(session.id);
				await page.screenshot(screenshotOpts);

				if (updateGoldens) {
					return { pass: true };
				}

				infoManager.set({ slowDuration: payload.slowDuration });
				const message = await runTest(infoManager, screenshotFile, goldenFile, passFile, rootLength);
				if (message) {
					if (message === FAILED_TEST.RESIZE) return { resizeRequired: true };
					return { pass: false, message };
				}
				return { pass: true };

			} else if (command === 'brightspace-visual-diff-compare-resize') {
				const screenshotImage = PNG.sync.read(await readFile(`${screenshotFile}.png`));
				const goldenImage = PNG.sync.read(await readFile(`${goldenFile}.png`));

				const newWidth = Math.max(screenshotImage.width, goldenImage.width);
				const newHeight = Math.max(screenshotImage.height, goldenImage.height);
				const newSize = { width: newWidth, height: newHeight };

				const newScreenshots = await createComparisonPNGs(screenshotImage, newSize);
				const newGoldens = await createComparisonPNGs(goldenImage, newSize);

				let bestIndex = 0;
				let { diff: bestDiffImage, pixelsDiff } = getPixelsDiff(newScreenshots[0].png, newGoldens[0].png);
				for (let i = 1; i < newScreenshots.length; i++) {
					const { diff: currentDiff, pixelsDiff: currentPixelsDiff } = getPixelsDiff(newScreenshots[i].png, newGoldens[i].png);

					if (currentPixelsDiff < pixelsDiff) {
						bestIndex = i;
						bestDiffImage = currentDiff;
						pixelsDiff = currentPixelsDiff;
					}
				}

				await writeFile(`${screenshotFile}-resized-screenshot.png`, PNG.sync.write(newScreenshots[bestIndex].png));
				await writeFile(`${screenshotFile}-resized-golden.png`, PNG.sync.write(newGoldens[bestIndex].png));
				await writeFile(`${screenshotFile}-diff.png`, PNG.sync.write(bestDiffImage));

				const rootLength = join(rootDir, PATHS.VDIFF_ROOT).length + 1;
				infoManager.set({
					diff: `${screenshotFile.substring(rootLength)}-diff.png`,
					golden: {
						path: `${screenshotFile.substring(rootLength)}-resized-golden.png`
					},
					new: {
						path: `${screenshotFile.substring(rootLength)}-resized-screenshot.png`
					},
					pixelsDiff
				});

				return { pass: false, message: `Images are not the same size. When resized, ${pixelsDiff} pixels are different.` };
			}

		}
	};
}
