import { access, mkdir, writeFile } from 'node:fs/promises';
import { argv, cwd } from 'node:process';
import { join } from 'node:path';

/** Test reporter that stores all failed test data for a given github actions job attempt */
export function attemptReporter() {

	function getFailedTests({ suites, tests }, parentName = '', failedTests = []) {
		tests.forEach(test => {
			if (!test.passed && test.error) {
				failedTests.push(`${parentName} ${test.name}`.trim());
			}
		});

		suites.forEach(suite => {
			getFailedTests(suite, `${parentName} ${suite.name}`, failedTests);
		});

		return failedTests;
	}

	function escapeRegExp(string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	let rootDir;

	return {
		start({ config }) {
			rootDir = config.rootDir;
		},
		async onTestRunFinished({ sessions }) {
			const cmd = argv.join(' ');
			const failedData = { [cmd]: {} };
			const failedSessions = sessions.filter(s => !s.passed);
			failedSessions.forEach(session => {
				const fileName = session.testFile.substring(rootDir.length + 1);
				failedData[cmd][fileName] = getFailedTests(session.testResults).map(t => `^${escapeRegExp(t)}$`).join('|');
			});

			const reportDir = join(cwd(), '.d2l-test');
			await access(reportDir).catch(async err => err && await mkdir(reportDir).catch(() => {}));
			console.log('WRITING ATTEMPT REPORT:');/* eslint-disable-line */
			console.log(failedData);/* eslint-disable-line */
			await writeFile(join(reportDir, '.attempt-report.js'), `/* eslint-disable */\n\nexport default ${JSON.stringify(failedData, null, '\t')}\n`);
		},
	};
}
