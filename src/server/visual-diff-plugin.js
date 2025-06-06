import { access, constants, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { env } from 'node:process';
import { PATHS } from './paths.js';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

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

async function createComparisonPNGs(original, newSize) {
	const resizedPNGs = [];
	[
		{ name: 'top', coord: 0 },
		{ name: 'center', coord: Math.floor((newSize.height - original.height) / 2) },
		{ name: 'bottom', coord: newSize.height - original.height }
	].forEach(y => {
		[
			{ name: 'left', coord: 0 },
			{ name: 'center', coord: Math.floor((newSize.width - original.width) / 2) },
			{ name: 'right', coord: newSize.width - original.width }
		].forEach(x => { // TODO: position added for reports, remove/adjust as needed
			if (original.width === newSize.width && original.height === newSize.height) {
				resizedPNGs.push({ png: original, position: `${y.name}-${x.name}` });
			} else {
				const resized = new PNG(newSize);
				PNG.bitblt(original, resized, 0, 0, original.width, original.height, x.coord, y.coord);
				resizedPNGs.push({ png: resized, position: `${y.name}-${x.name}` });
			}
		});
	});

	return resizedPNGs;
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

const testInfoMap = new Map();
export function getTestInfo(session, fullTitle) {
	return testInfoMap.get(getTestInfoKey(session, fullTitle));
}
function getTestInfoKey(session, fullTitle) {
	return `${session.browser.name.toLowerCase()}|${session.testFile}|${fullTitle}`;
}
function setTestInfo(session, fullTitle, testInfo) {
	const key = getTestInfoKey(session, fullTitle);
	if (testInfoMap.has(key)) {
		const info = testInfoMap.get(key);
		testInfo.slowDuration = info.slowDuration;
		if (info.golden || testInfo.golden) {
			testInfo.golden = { ...info.golden, ...testInfo.golden };
		}
		if (info.new || testInfo.new) {
			testInfo.new = { ...info.new, ...testInfo.new };
		}
		testInfo.diff = testInfo.diff || info.diff;
	}
	testInfoMap.set(key, testInfo);
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
					animations: 'disabled',
					path: updateGoldens ? goldenFileName : screenshotFileName
				};

				if (payload.fullPage) screenshotOpts.fullPage = true;
				if (payload.rect) screenshotOpts.clip = payload.rect;

				const page = session.browser.getPage(session.id);
				await page.screenshot(screenshotOpts);

				if (updateGoldens) {
					return { pass: true };
				}

				const rootLength = join(rootDir, PATHS.VDIFF_ROOT).length + 1;

				const screenshotFileBuffer = await readFile(screenshotFileName);
				const screenshotImage = PNG.sync.read(screenshotFileBuffer);
				setTestInfo(session, payload.name, {
					slowDuration: payload.slowDuration,
					new: {
						height: screenshotImage.height,
						path: passFileName.substring(rootLength),
						width: screenshotImage.width
					}
				});

				const goldenExists = await checkFileExists(goldenFileName);
				if (!goldenExists) {
					setTestInfo(session, payload.name, {
						new: {
							path: `${screenshotFile.substring(rootLength)}.png`
						}
					});
					return { pass: false, message: 'No golden exists. Use the "--golden" CLI flag to re-run and re-generate goldens.' };
				}

				const goldenFileBuffer = await readFile(goldenFileName);
				const goldenImage = PNG.sync.read(goldenFileBuffer);
				setTestInfo(session, payload.name, {
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
						return { pass: true };
					}

					const diff = new PNG({ width: screenshotImage.width, height: screenshotImage.height });
					const pixelsDiff = pixelmatch(
						screenshotImage.data, goldenImage.data, diff.data, screenshotImage.width, screenshotImage.height, { diffMask: true, threshold: DEFAULT_TOLERANCE }
					);

					if (pixelsDiff !== 0) {
						setTestInfo(session, payload.name, {
							diff: `${screenshotFile.substring(rootLength)}-diff.png`,
							new: {
								path: `${screenshotFile.substring(rootLength)}.png`
							},
							pixelsDiff
						});
						await writeFile(`${screenshotFile}-diff.png`, PNG.sync.write(diff));
						return { pass: false, message: `Image does not match golden. ${pixelsDiff} pixels are different.` };
					} else {
						setTestInfo(session, payload.name, {
							golden: {
								byteSize: goldenSize
							},
							new: {
								path: `${screenshotFile.substring(rootLength)}.png`,
								byteSize: screenshotSize
							},
							pixelsDiff
						});
						return { pass: false, message: 'Image diff is clean but the images do not have the same bytes.' };
					}
				} else {
					return { resizeRequired: true };
				}
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
				let pixelsDiff = Number.MAX_SAFE_INTEGER;
				for (let i = 0; i < newScreenshots.length; i++) {
					const currentDiff = new PNG(newSize);
					const currentPixelsDiff = pixelmatch(
						newScreenshots[i].png.data, newGoldens[i].png.data, currentDiff.data, currentDiff.width, currentDiff.height, { diffMask: true, threshold: DEFAULT_TOLERANCE }
					);

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
				setTestInfo(session, payload.name, {
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
