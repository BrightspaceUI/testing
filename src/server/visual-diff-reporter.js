import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { env } from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getTestInfo } from './visual-diff-plugin.js';
import { PATHS } from './paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isCI = !!env['CI'];

function createData(rootDir, updateGoldens, sessions) {

	let metadata = {};
	const metadataPath = join(rootDir, PATHS.METADATA);
	if (existsSync(metadataPath)) {
		metadata = JSON.parse(readFileSync(metadataPath));
	}

	const files = new Map();
	const browsers = new Map();

	sessions.forEach(s => {

		const browserName = s.browser.name;
		if (!browsers.has(browserName)) {
			const prevBrowser = metadata.browsers?.find(b => b.name === browserName);
			browsers.set(browserName, {
				name: browserName,
				numByteDiff: 0,
				numFailed: 0,
				version: parseInt(s.browser.browser.version()),
				previousVersion: prevBrowser?.version
			});
		}
		const browserData = browsers.get(browserName);

		const fileName = s.testFile.substring(rootDir.length + 1);
		if (!files.has(fileName)) {
			files.set(fileName, { name: fileName, numByteDiff: 0, numFailed: 0, tests: new Map() });
		}
		const fileData = files.get(fileName);
		flattenResults(s, browserData, fileData);

	});

	let numTests = 0, numFailed = 0, numByteDiff = 0;
	files.forEach(f => {
		numTests += f.tests.size;
		f.tests.forEach(t => {
			if (t.numFailed > 0) {
				f.numFailed++;
				numFailed++;
			}
			if (t.numByteDiff > 0) {
				f.numByteDiff++;
				numByteDiff++;
			}
		});
	});

	if (isCI || updateGoldens) {
		metadata.browsers = Array.from(browsers.values()).map(b => {
			return { name: b.name, version: b.version };
		});
		writeFileSync(metadataPath, `${JSON.stringify(metadata, undefined, '\t')}\n`);
	}

	return { browsers, files, numByteDiff, numFailed, numTests };

}

function flattenResults(session, browserData, fileData) {

	function collectTests(prefix, tests) {
		tests.forEach(t => {
			const testName = `${prefix}${t.name}`;
			const testKey = testName.replaceAll(' > ', ' ');
			const info = getTestInfo(session, testKey);

			// tests missing info but with no error were skipped via grep, so exclude them
			if (!info && !t.error) return;

			if (!fileData.tests.has(testName)) {
				fileData.tests.set(testName, {
					name: testName,
					numByteDiff: 0,
					numFailed: 0,
					results: []
				});
			}
			const testData = fileData.tests.get(testName);
			const bytediff = !t.passed && !!info?.diff && info?.pixelsDiff === 0;
			if (!t.passed) {
				if (bytediff) {
					browserData.numByteDiff++;
					testData.numByteDiff++;
				}
				browserData.numFailed++;
				testData.numFailed++;
			}
			testData.results.push({
				name: browserData.name,
				duration: t.duration,
				error: t.error?.message,
				passed: t.passed,
				bytediff,
				info: info
			});
		});
	}

	function collectSuite(prefix, suite) {
		collectTests(prefix, suite.tests);
		suite.suites.forEach(s => collectSuite(`${prefix}${s.name} > `, s));
	}

	if (session.testResults) {
		collectSuite('', session.testResults);
	}

}

export function visualDiffReporter({ updateGoldens } = {}) {
	let rootDir;
	return {
		start({ config }) {
			rootDir = config.rootDir;
			rmSync(join(rootDir, PATHS.VDIFF_ROOT, PATHS.REPORT_ROOT), { force: true, recursive: true });
		},
		stop({ sessions }) {

			const data = createData(rootDir, updateGoldens, sessions);
			const json = JSON.stringify(data, (_key, val) => {
				if (val instanceof Map) return [...val.values()].sort((a, b) => a.name.localeCompare(b.name));
				return val;
			}, '\t');

			if (updateGoldens) return;

			const inputDir = join(__dirname, 'report');
			const reportDir = join(rootDir, PATHS.VDIFF_ROOT, PATHS.REPORT_ROOT);
			const tempDir = join(reportDir, 'temp');

			mkdirSync(reportDir, { recursive: true });

			cpSync(inputDir, tempDir, { force: true, recursive: true });
			writeFileSync(join(tempDir, 'data.js'), `export default ${json};`);

			execSync(`npx rollup -c ${join(__dirname, './rollup.config.js')}`, { stdio: 'pipe' });

			rmSync(tempDir, { recursive: true });

		}
	};
}
