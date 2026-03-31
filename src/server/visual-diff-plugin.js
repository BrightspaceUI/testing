import { access, constants, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { env } from 'node:process';
import { PATHS } from './paths.js';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { TestInfoManager } from './visual-diff-info.js';

const isCI = !!env['CI'];
const DEFAULT_TOLERANCE = 0; // TODO: Support tolerance override?

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

async function createComparisonPNGs(original, newSize) {
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
			const goldenFileName = `${join(newPath, PATHS.GOLDEN, browser, newName)}.png`;
			const passFileName = `${join(newPath, PATHS.PASS, browser, newName)}.png`;
			const screenshotFile = join(newPath, PATHS.FAIL, browser, newName);
			const screenshotFileName = `${screenshotFile}.png`;

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

				async function takeScreenshot() {
					const path = updateGoldens ? goldenFileName : screenshotFileName;
					const page = session.browser.getPage(session.id);
					return await page.screenshot({ path, ...screenshotOpts });
				}

				const screenshotFileBuffer = await takeScreenshot();

				if (updateGoldens) {
					return { pass: true };
				}

				const rootLength = join(rootDir, PATHS.VDIFF_ROOT).length + 1;

				async function runCompareTest() {
					const screenshotImage = PNG.sync.read(screenshotFileBuffer);
					infoManager.set({
						slowDuration: payload.slowDuration,
						new: {
							height: screenshotImage.height,
							path: screenshotFileName.substring(rootLength),
							width: screenshotImage.width
						}
					});

					const goldenExists = await checkFileExists(goldenFileName);
					if (!goldenExists) {
						return { pass: false, message: 'No golden exists. Use the "--golden" CLI flag to re-run and re-generate goldens.' };
					}

					const goldenFileBuffer = await readFile(goldenFileName);
					const goldenImage = PNG.sync.read(goldenFileBuffer);
					infoManager.set({
						golden: {
							height: goldenImage.height,
							path: goldenFileName.substring(rootLength),
							width: goldenImage.width
						}
					});

					if (screenshotImage.width === goldenImage.width && screenshotImage.height === goldenImage.height) {
						const goldenSize = (await stat(goldenFileName)).size;
						const screenshotSize = (await stat(screenshotFileName)).size;
						if (goldenSize === screenshotSize && screenshotFileBuffer.equals(goldenFileBuffer)) {
							const success = await tryMoveFile(screenshotFileName, passFileName);
							if (!success) return { pass: false, message: 'Problem moving file to "pass" directory.' };
							infoManager.set({
								new: {
									path: passFileName.substring(rootLength)
								}
							});
							return { pass: true };
						}

						const { diff, pixelsDiff } = getPixelsDiff(screenshotImage, goldenImage);

						if (pixelsDiff !== 0) {
							infoManager.set({
								diff: `${screenshotFile.substring(rootLength)}-diff.png`,
								pixelsDiff
							});
							await writeFile(`${screenshotFile}-diff.png`, PNG.sync.write(diff));
							return { pass: false, message: `Image does not match golden. ${pixelsDiff} pixels are different.` };
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
							return { pass: false, message: 'Image diff is clean but the images do not have the same bytes.' };
						}
					} else {
						return { resizeRequired: true };
					}
				}
				return await runCompareTest();
			} else if (command === 'brightspace-visual-diff-compare-resize') {
				const screenshotImage = PNG.sync.read(await readFile(screenshotFileName));
				const goldenImage = PNG.sync.read(await readFile(goldenFileName));

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
					pixelsDiff: bestPixelsDiff
				});

				return { pass: false, message: `Images are not the same size. When resized, ${bestPixelsDiff} pixels are different.` };
			}

		}
	};
}
