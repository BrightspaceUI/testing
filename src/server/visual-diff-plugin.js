import { access, constants, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path, { basename, dirname, join } from 'node:path';
import { env } from 'node:process';
import { PATHS } from './paths.js';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const isCI = !!env['CI'];
const DEFAULT_TOLERANCE = 0; // TODO: Support tolerance override?
const ALTERNATIVE_TESTS = {
	dark: {
		set() {
			document.documentElement.setAttribute('dark', '');
		},
		reset() {
			document.documentElement.removeAttribute('dark');
		}
	}
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

/**
 *
 * @param {string} xName
 * @param {string} yName
 * @param {import('pngjs').PNGWithMetadata} original
 * @param {import('pngjs').PNGWithMetadata} newSize
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
 *
 * @param {import('pngjs').PNGWithMetadata} original
 * @param {import('pngjs').PNGWithMetadata} newSize
 */
async function createComparisonPNGs(original, newSize) {
	/**@type {Array<{png: PNG}, position: string}>} */
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
		for (const screenshot of ['golden', 'new', ...Object.keys(ALTERNATIVE_TESTS)]) {
			if (info[screenshot] || testInfo[screenshot]) {
				testInfo[screenshot] = { ...info[screenshot], ...testInfo[screenshot] };
			}
		}
		testInfo.diff = testInfo.diff || info.diff;
	}
	testInfoMap.set(key, testInfo);
}

function getPixelsDiff(screenshotImage, goldenImage) {
	const diff = new PNG({ width: screenshotImage.width, height: screenshotImage.height });
	const pixelsDiff = pixelmatch(
		screenshotImage.data, goldenImage.data, diff.data, screenshotImage.width, screenshotImage.height, { diffMask: true, threshold: DEFAULT_TOLERANCE }
	);
	return { diff, pixelsDiff };
}

async function compareScreenshots(screenshotFileName, goldenFileName) {
	const screenshotFileBuffer = await readFile(screenshotFileName);
	const screenshotImage = PNG.sync.read(screenshotFileBuffer);

	if (!(await checkFileExists(goldenFileName))) return { screenshotImage };

	const goldenFileBuffer = await readFile(goldenFileName);
	const goldenImage = PNG.sync.read(goldenFileBuffer);
	const result = { screenshotImage, isEqual: false, goldenImage };
	if (screenshotImage.width === goldenImage.width && screenshotImage.height === goldenImage.height) {
		const goldenSize = (await stat(goldenFileName)).size;
		const screenshotSize = (await stat(screenshotFileName)).size;
		const isEqual = goldenSize === screenshotSize && screenshotFileBuffer.equals(goldenFileBuffer);
		if (isEqual) return { ...result, isEqual: true };

		const { diff, pixelsDiff } = getPixelsDiff(screenshotImage, goldenImage);
		if (pixelsDiff === 0) return { ...result, goldenSize, screenshotSize };
		return { ...result, diff, pixelsDiff };
	}
	return result;
}

async function resizeCompareScreenshots(screenshotFileName, goldenFileName) {
	const screenshotImage = PNG.sync.read(await readFile(screenshotFileName));
	const goldenImage = PNG.sync.read(await readFile(goldenFileName));

	const newWidth = Math.max(screenshotImage.width, goldenImage.width);
	const newHeight = Math.max(screenshotImage.height, goldenImage.height);
	const newSize = { width: newWidth, height: newHeight };

	const newScreenshots = await createComparisonPNGs(screenshotImage, newSize);
	const newGoldens = await createComparisonPNGs(goldenImage, newSize);

	let bestIndex = 0;
	let { diff: bestDiffImage, pixelsDiff } = getPixelsDiff(newScreenshots[0].png, newGoldens[0].png);
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

	return {
		screenshotImage: newScreenshots[bestIndex].png,
		goldenImage: newGoldens[bestIndex].png,
		bestPosition: newScreenshots[bestIndex].position,
		diff: bestDiffImage,
		pixelsDiff
	};
}

async function resolveTest(session, testName, result, subtestName, screenshotFile, passFile, rootLength) {
	const isAlt = subtestName !== 'new';
	const prefix = isAlt ? `(${subtestName})` : '';
	const suffix = isAlt ? `.${subtestName}` : '';
	const screenshotFileName = `${screenshotFile}${suffix}.png`;
	const passFileName = `${passFile}${suffix}.png`;
	if (result.isEqual) {
		const success = await tryMoveFile(screenshotFileName, passFileName);
		if (!success) {
			return `${prefix} Test passed but failed to move screenshot to pass directory.`;
		}
		setTestInfo(session, testName, {
			[subtestName]: {
				path: passFileName.substring(rootLength),
			}
		});
		return null;
	}
	if ('pixelsDiff' in result) {
		const info =  {
			diff: `${screenshotFile.substring(rootLength)}-diff${suffix}.png`,
			pixelsDiff: result.pixelsDiff
		}

		setTestInfo(session, testName, !isAlt ? info : {
			[subtestName]: info
		});
		await writeFile(`${screenshotFile}-diff${suffix}.png`, PNG.sync.write(result.diff));
		return `Image does not match golden. ${result.pixelsDiff} pixels are different.`;
	} else {
		setTestInfo(session, testName, {
			golden: {
				byteSize: result.goldenSize
			},
			[subtestName]: {
				byteSize: result.screenshotSize
			},
			pixelsDiff: 0
		});
		return 'Image diff is clean but the images do not have the same bytes.';
	}
}

async function resolveResizeTest(session, testName, subtestName, screenshotFile, screenshotImage, goldenImage, diff, pixelsDiff, rootLength) {
	const isAlt = subtestName !== 'new';
	const prefix = isAlt ? `(${subtestName})` : '';
	const suffix = isAlt ? `.${subtestName}` : '';

	const screenshotFileName = `${screenshotFile}-resized-screenshot${suffix}.png`;
	const goldenFileName = `${screenshotFile}-resized-golden${suffix}.png`;
	const diffFileName = `${screenshotFile}-diff${suffix}.png`;

	await writeFile(screenshotFileName, PNG.sync.write(screenshotImage));
	await writeFile(goldenFileName, PNG.sync.write(goldenImage));
	await writeFile(diffFileName, PNG.sync.write(diff));
	setTestInfo(session, testName, {
		[subtestName]: {
			path: `${screenshotFileName.substring(rootLength)}`
		}
	})

	const info = {
		diff: `${diffFileName.substring(rootLength)}`,
		golden: {
			path: `${goldenFileName.substring(rootLength)}`
		},
		pixelsDiff
	}

	setTestInfo(session, testName, !isAlt ? info : {
		[subtestName]: info
	});

	return `${prefix}When resized, ${pixelsDiff} pixels are different.`;
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
			const goldenFile = join(newPath, PATHS.GOLDEN, browser, newName)
			const goldenFileName = `${goldenFile}.png`;
			const passFile = join(newPath, PATHS.PASS, browser, newName)
			const screenshotFile = join(newPath, PATHS.FAIL, browser, newName);
			const screenshotFileName = `${screenshotFile}.png`;
			const alternativeTests = /**@type {string[]}*/(payload.alternativeTests);
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
					animations: 'disabled',
					path: updateGoldens ? goldenFileName : screenshotFileName
				};

				if (payload.fullPage) screenshotOpts.fullPage = true;
				if (payload.rect) screenshotOpts.clip = payload.rect;

				const page = session.browser.getPage(session.id);
				await page.screenshot(screenshotOpts);

				await Promise.all(alternativeTests.map(async test => {
					const path = `${updateGoldens ? goldenFile : screenshotFile}.${test}.png`;
					const altScreenshotOpts = {
						...screenshotOpts,
						path
					};
					await page.evaluate(ALTERNATIVE_TESTS[test].set);
					await page.screenshot(altScreenshotOpts);
					await page.evaluate(ALTERNATIVE_TESTS[test].reset);
					setTestInfo(session, payload.name, {
						[test]: {
							path: path.substring(rootLength)
						}
					});
				}));

				if (updateGoldens) {
					return { pass: true };
				}

				const result = await compareScreenshots(screenshotFileName, goldenFileName);
				setTestInfo(session, payload.name, {
					slowDuration: payload.slowDuration,
					new: {
						height: result.screenshotImage.height,
						path: screenshotFileName.substring(rootLength),
						width: result.screenshotImage.width
					}
				});

				if (!('goldenImage' in result)) {
					return { pass: false, message: 'No golden exists. Use the "--golden" CLI flag to re-run and re-generate goldens.' };
				}

				setTestInfo(session, payload.name, {
					golden: {
						height: result.goldenImage.height,
						path: goldenFileName.substring(rootLength),
						width: result.goldenImage.width
					}
				});

				if (!result.isEqual && !('diff' in result) && !('goldenSize' in result)) {
					return { resizeRequired: true };
				}

				const base = await resolveTest(session, payload.name, result, 'new', screenshotFile, passFile, rootLength);
				//No alt test returns single message
				if (alternativeTests.length === 0) {
					if (base === null) return { pass: true };
					return { pass: false, message: base };
				}


				const messages = (await Promise.all(alternativeTests.map(async test => {
					const altResult = await compareScreenshots(
						`${screenshotFile}.${test}.png`,
						`${goldenFile}.${test}.png`
					);
					setTestInfo(session, payload.name, {
						[test]: {
							height: altResult.screenshotImage.height,
							width: altResult.screenshotImage.width,
							path: `${screenshotFile.substring(rootLength)}.${test}.png`,
							golden: {
								path: `${goldenFile.substring(rootLength)}.${test}.png`,
								height: altResult.goldenImage.height,
								width: altResult.goldenImage.width
							}
						}
					});
					return await resolveTest(session, payload.name, altResult, test, screenshotFile, passFile, rootLength);
				}))).filter(msg => msg !== null);
				if (messages.length === 0 && base === null) {
					return { pass: true };
				}
				return {
					pass: false,
					message: `One or more tests failed:\n${[base, ...messages].filter(msg => msg !== null).join('\n')}`
				}



			} else if (command === 'brightspace-visual-diff-compare-resize') {

				const { screenshotImage, goldenImage, diff, pixelsDiff, bestPosition } = await resizeCompareScreenshots(screenshotFileName, goldenFileName);

				const base = await resolveResizeTest(session, payload.name, 'new', screenshotFile, screenshotImage, goldenImage, diff, pixelsDiff, rootLength);
				if (alternativeTests.length === 0) {
					return { pass: false, message: `Images are not the same size. ${base}` };
				}

				const [x,y] = bestPosition.split('-');
				const newSize = { width: screenshotImage.width, height: screenshotImage.height };
				const messages = (await Promise.all(alternativeTests.map(async test => {
					const altScreenshotImage = getResizedPng(x,y, PNG.sync.read(await readFile(`${screenshotFile}.${test}.png`)), newSize);
					const altGoldenImage = getResizedPng(x, y, PNG.sync.read(await readFile(`${goldenFile}.${test}.png`)), newSize);
					const { diff, pixelsDiff } = getPixelsDiff(altScreenshotImage, altGoldenImage);
					return await resolveResizeTest(session, payload.name, test, `${screenshotFile}.${test}`, altScreenshotImage, altGoldenImage, diff, pixelsDiff, rootLength);
				})));

				return {
					pass: false,
					message: `Images were not the same size:\n${[base, ...messages].join('\n')}`
				};
			}

		}
	};
}
