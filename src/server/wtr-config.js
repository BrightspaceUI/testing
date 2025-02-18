import { env, platform } from 'node:process';
import { defaultReporter } from '@web/test-runner';
import { headedMode } from './headed-mode-plugin.js';
import { join } from 'node:path';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { registryDirectory } from 'playwright-core/lib/server';
import revisions from '../browser-revisions.js';
import { reporter as testReportingReporter } from 'd2l-test-reporting/reporters/web-test-runner.js';
import { visualDiff } from './visual-diff-plugin.js';
import { visualDiffReporter } from './visual-diff-reporter.js';

const defaultReporterGrep = () => {
	const dr = defaultReporter();
	const removeGrepFailures = results => {
		let passed = true;
		results.tests?.forEach(test => {
			if (test.error) {
				passed = false;
			} else if (!test.passed) {
				test.skipped = true;
			}
		});

		const passedStates = results.suites?.map(suite => removeGrepFailures(suite));
		const nestedPassed = !passedStates?.includes(false);
		return passed && nestedPassed;
	};

	return { ...dr,
		getTestProgress({ sessions, ...others }) {
			sessions.forEach(session => {
				if (session.testResults) {
					session.passed = removeGrepFailures(session.testResults) && !session.errors.length;
				}
			});
			return dr.getTestProgress({ sessions, ...others });
		}
	};
};

const DEFAULT_PATTERN = type => `./test/**/*.${type}.js`;
const DEFAULT_TEST_REPORTING = !!env['CI'];
const BROWSER_MAP = {
	chrome: 'chromium',
	chromium: 'chromium',
	firefox: 'firefox',
	safari: 'webkit',
	webkit: 'webkit'
};
const ALLOWED_BROWSERS = Object.keys(BROWSER_MAP);
const DEFAULT_BROWSERS = [...new Set(Object.values(BROWSER_MAP))];
const EXECUTABLE_PATHS = {
	'chromium': {
		'linux': ['chrome-linux', 'chrome'],
		'darwin': ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
		'win32': ['chrome-win', 'chrome.exe'],
	},
	'firefox': {
		'linux': ['firefox', 'firefox'],
		'darwin': ['firefox', 'Nightly.app', 'Contents', 'MacOS', 'firefox'],
		'win32': ['firefox', 'firefox.exe'],
	},
	'webkit': {
		'linux': ['pw_run.sh'],
		'darwin': ['pw_run.sh'],
		'win32': ['Playwright.exe'],
	}
};
const TIMEZONE = '{&quot;name&quot;:&quot;Canada - Toronto&quot;,&quot;identifier&quot;:&quot;America/Toronto&quot;}';
const FONT_ASSETS = 'https://s.brightspace.com/lib/fonts/0.6.1/assets/';
const TEST_PAGE = '<script>window.isD2LTestPage = true;</script>';
const SUPPRESS_RESIZE_OBSERVER_ERRORS = `
	<script>
	window.addEventListener('error', (err) => {
		if (err.message.includes('ResizeObserver')) {
			err.stopImmediatePropagation();
		}
	});
	</script>
`;
export const DEFAULT_VDIFF_SLOW = 500;

export class WTRConfig {

	constructor(cliArgs) {
		this.#cliArgs = cliArgs || {};
		this.#cliArgs.group ??= 'test';
		const requestedBrowsers = ALLOWED_BROWSERS.filter(b => cliArgs && Object.hasOwn(cliArgs, b)).map(b => (cliArgs?.[b] ? `${b}-${cliArgs[b]}` : b));
		this.#requestedBrowsers = requestedBrowsers.length && requestedBrowsers;
	}
	get visualDiffGroup() {
		return {
			name: 'vdiff',
			files: this.#pattern,
			browsers: [BROWSER_MAP.chrome],
			testRunnerHtml: testFramework =>
				`<!DOCTYPE html>
				<html lang="en" data-timezone='${TIMEZONE}'>
					<head>
						<link rel="preload" href="${FONT_ASSETS}Lato-400.woff2" as="font" type="font/woff2" crossorigin>
						<link rel="preload" href="${FONT_ASSETS}Lato-700.woff2" as="font" type="font/woff2" crossorigin>
						<style>

							* {
								--d2l-document-direction: ltr;
							}

							html[dir="rtl"] * {
								--d2l-document-direction: rtl;
							}

							@font-face {
								font-family: 'Lato';
								font-style: normal;
								font-weight: 400;
								src: url(${FONT_ASSETS}Lato-400.woff2) format('woff2');
							}
							@font-face {
								font-family: 'Lato';
								font-style: normal;
								font-weight: 700;
								src: url(${FONT_ASSETS}Lato-700.woff2) format('woff2');
							}

							html {
								font-size: 20px;
							}
							body {
								background-color: #ffffff;
								color: var(--d2l-color-ferrite, #202122);
								font-family: 'Lato', sans-serif;
								letter-spacing: 0.01rem;
								font-size: 0.95rem;
								font-weight: 400;
								line-height: 1.4rem;
								margin: 0;
								padding: 38px;
							}
							body.no-padding {
								padding: 0;
							}
						</style>
					</head>
					<body>
						${TEST_PAGE}
						${SUPPRESS_RESIZE_OBSERVER_ERRORS}
						<script type="module" src="${testFramework}"></script>
					</body>
				</html>`
		};
	}
	create({
		pattern = DEFAULT_PATTERN,
		slow,
		timeout,
		testReporting = DEFAULT_TEST_REPORTING,
		...passthroughConfig
	} = {}) {

		const { files, filter, golden, grep, group, open, watch } = this.#cliArgs;
		const passthroughGroupNames = passthroughConfig.groups?.map(g => g.name) ?? [];

		delete passthroughConfig.browsers;

		if (typeof pattern !== 'function') throw new TypeError('pattern must be a function');
		this.pattern = pattern;

		const config = {
			...this.#defaultConfig,
			...this.#getMochaConfig(group, slow, timeout),
			...passthroughConfig
		};

		if (!['test', 'vdiff', ...passthroughGroupNames].includes(group)) {
			config.groups.push({ name: group, files: this.#pattern });
		} else {
			const groupConfig = config.groups.find(g => g.name === group);
			if (groupConfig) {
				groupConfig.files = this.#pattern;
			}
		}

		if (filter) {
			config.groups.forEach(group => {
				group.files = this.#filterFiles([ group.files ].flat());
			});
		}

		config.reporters ??= [ defaultReporterGrep() ];

		if (group === 'test') {
			config.groups.push({
				name: 'test',
				files: this.#pattern
			});
		} else if (group === 'vdiff') {
			config.testsFinishTimeout = 5 * 60 * 1000;

			config.reporters.push(visualDiffReporter({ updateGoldens: golden }));

			config.plugins ??= [];
			config.plugins.push(visualDiff({ updateGoldens: golden, runSubset: !!(filter || grep) }));

			config.groups.push(this.visualDiffGroup);
		}

		if (testReporting) {
			config.reporters.push(testReportingReporter());
		}

		// convert all browsers to playwright
		config.groups.forEach(g => g.browsers = this.getBrowsers(g.browsers, g.name === 'vdiff' ? 2 : 1));

		if (open || watch) {
			config.testsFinishTimeout = 15 * 60 * 1000;
			config.plugins ??= [];
			const currentPattern = files || config.groups.find(g => g.name === group)?.files;

			config.plugins.push(headedMode({
				pattern: currentPattern,
				open,
				watch
			}));
		}

		return config;
	}
	getBrowsers(browsers, deviceScaleFactor) {
		browsers = (this.#requestedBrowsers || browsers || DEFAULT_BROWSERS).map(b => {
			const [product, version] = b.split('-');
			return BROWSER_MAP[product] ? `${BROWSER_MAP[product]}${version ? `-${version}` : ''}` : BROWSER_MAP.chrome;
		});
		if (!Array.isArray(browsers)) throw new TypeError('browsers must be an array');

		return [...new Set(browsers)].map((b) => {
			const [product, version] = b.split('-');
			let revision;
			if (version) {
				revision = revisions[product]?.findLast(([gc, v]) => v.startsWith(version))?.[0];
				!revision && console.warn(`Unknown browser revision: ${product} ${version}`);
			}

			return playwrightLauncher({
				concurrency: product === BROWSER_MAP.firefox || this.#cliArgs.open ? 1 : undefined, // focus in Firefox unreliable if concurrency > 1 (https://github.com/modernweb-dev/web/issues/238)
				product,
				createBrowserContext: ({ browser }) => browser.newContext({ deviceScaleFactor, reducedMotion: 'reduce' }),
				launchOptions: {
					...(revision && { executablePath: join(registryDirectory, `${product}-${revision}`, ...EXECUTABLE_PATHS[product][platform]) }),
					headless: !this.#cliArgs.open,
					devtools: false,
					slowMo: this.#cliArgs.slowmo || 0,
					args: product === BROWSER_MAP.chrome ? ['--disable-gpu-rasterization'] : []
				}
			});
		});
	}
	#cliArgs;

	#requestedBrowsers;

	get #defaultConfig() {
		return {
			browserStartTimeout: 60 * 1000,
			groups: [],
			nodeResolve: {
				exportConditions: ['default']
			},
			testRunnerHtml: testFramework =>
				`<!DOCTYPE html>
				<html lang="en" data-timezone='${TIMEZONE}'>
					<body>
						${TEST_PAGE}
						${SUPPRESS_RESIZE_OBSERVER_ERRORS}
						<script type="module" src="${testFramework}"></script>
					</body>
				</html>`,
		};
	}

	get #pattern() {
		const files = [ this.#cliArgs.files || this.pattern(this.#cliArgs.group), '!**/node_modules/**/*' ].flat();

		if (this.#cliArgs.filter) {
			return this.#filterFiles(files);
		}

		return files;
	}

	#filterFiles(files) {
		return this.#cliArgs.filter.map(filterStr => {
			// replace everything after the last forward slash
			return files
				.filter(f => !f.startsWith('!')) // don't filter exclusions
				.map(f => f.replace(/[^/]*$/, fileGlob => {
					// create a new glob for each wildcard
					const fileGlobs = Array.from(fileGlob.matchAll(/(?<!\*)\*(?!\*)/g)).map(({ index }) => {
						const arr = fileGlob.split('');
						arr.splice(index, 1, filterStr);
						return arr.join('');
					});
					return `+(${fileGlobs.join('|') || fileGlob})`;
				}));
		})
			.flat()
			.concat(files.filter(f => f.startsWith('!')));
	}

	#getMochaConfig(group, slowConfig, timeoutConfig) {
		const {
			timeout = timeoutConfig,
			grep,
			open,
			slow = slowConfig,
			watch
		} = this.#cliArgs;

		if (typeof timeout !== 'undefined' && typeof timeout !== 'number') throw new TypeError('timeout must be a number');
		if (typeof slow !== 'undefined' && typeof slow !== 'number') throw new TypeError('slow must be a number');

		const config = {};

		if (timeout) {
			config.timeout = String(timeout);
		} else if (group === 'vdiff') {
			config.timeout = '5000';
		}
		if (open || watch) config.timeout = '0';
		if (grep) config.grep = grep;
		if (slow) {
			config.slow = String(slow);
		} else if (group === 'vdiff') {
			config.slow = String(DEFAULT_VDIFF_SLOW);
		}

		return Object.keys(config).length && { testFramework: { config } };
	}

}
