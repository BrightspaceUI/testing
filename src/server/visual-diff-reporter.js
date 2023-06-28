import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { getTestInfo } from './visual-diff-plugin.js';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createData(rootDir, sessions) {

	const files = new Map();
	const browsers = new Map();

	sessions.forEach(s => {

		const browserName = s.browser.name;
		if (!browsers.has(browserName)) {
			browsers.set(browserName, {
				name: browserName,
				numFailed: 0,
				version: s.browser.browser.version().substring(0, s.browser.browser.version().indexOf('.'))
			});
		}
		const browserData = browsers.get(browserName);

		const fileName = s.testFile.substring(rootDir.length + 1);
		if (!files.has(fileName)) {
			files.set(fileName, { name: fileName, numFailed: 0, tests: new Map() });
		}
		const fileData = files.get(fileName);
		flattenResults(s, browserData, fileData);

	});

	return { files, browsers };

}

function flattenResults(session, browserData, fileData) {

	function collectTests(prefix, tests) {
		tests.forEach(t => {
			const testName = `${prefix}${t.name}`;
			const testKey = testName.replaceAll(' > ', ' ');
			if (!fileData.tests.has(testName)) {
				fileData.tests.set(testName, {
					name: testName,
					numFailed: 0,
					results: []
				});
			}
			const testData = fileData.tests.get(testName);
			if (!t.passed) {
				browserData.numFailed++;
				fileData.numFailed++;
				testData.numFailed++;
			}
			testData.results.push({
				name: browserData.name,
				duration: t.duration,
				error: t.error?.message,
				passed: t.passed,
				info: getTestInfo(session, testKey)
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

export function visualDiffReporter({ reportResults = true } = {}) {
	let rootDir;
	return {
		start({ config }) {
			rootDir = config.rootDir;
		},
		stop({ sessions }) {

			if (!reportResults) return;

			const data = createData(rootDir, sessions);
			const json = JSON.stringify(data, (_key, val) => {
				if (val instanceof Map) return [...val.values()].sort((a, b) => a.name.localeCompare(b.name));
				return val;
			}, '\t');

			writeFileSync(join(__dirname, 'report', 'data.js'), `export default ${json};`);

			execSync(`rollup -c ${join(__dirname, './report/rollup.config.js')}`);

		}
	};
}
