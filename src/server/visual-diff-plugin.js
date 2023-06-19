import { access, constants, mkdir, rename, stat } from 'node:fs/promises';
import { dirname, join } from 'path';

const DEFAULT_MARGIN = 10;

async function checkFileExists(fileName) {
	try {
		await access(fileName, constants.F_OK);
		return true;
	} catch (e) {
		return false;
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

export function visualDiff({ updateGoldens = false } = {}) {
	let rootDir;
	return {
		name: 'brightspace-visual-diff',
		async serverStart({ config }) {
			rootDir = config.rootDir;
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
			const goldenFileName = `${join(rootDir, '.vdiff', testPath, 'golden', browser, dir, newName)}.png`;
			const passFileName = `${join(rootDir, '.vdiff', testPath, 'pass', browser, dir, newName)}.png`;
			const screenshotFileName = `${join(rootDir, '.vdiff', testPath, 'fail', browser, dir, newName)}.png`;

			const opts = payload.opts || {};
			opts.margin = opts.margin || DEFAULT_MARGIN;

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
