import { defaultReporter } from '@web/test-runner';
import { headedMode } from './headed-mode-plugin.js';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { visualDiff } from './visual-diff-plugin.js';
import { visualDiffReporter } from './visual-diff-reporter.js';

//const DISALLOWED_ARGS = ['browsers', 'playwright', '_unknown'];
const DEFAULT_PATTERN = type => `./test/**/*.${type}.js`;
const ALLOWED_BROWSERS = ['chrome', 'firefox', 'safari'];
const BROWSER_MAP = { chrome: 'chromium', firefox: 'firefox', safari: 'webkit' };

export class WTRConfig {

	#cliArgs;
	#requestedBrowsers;

	constructor(cliArgs) {
		this.#cliArgs = cliArgs || {};
		this.#cliArgs.group ??= 'unit';
		const requestedBrowsers = ALLOWED_BROWSERS.filter(b => cliArgs?.[b]);
		this.#requestedBrowsers = requestedBrowsers.length && requestedBrowsers;
	}

	get #defaultConfig() {
		return {
			nodeResolve: true,
			testRunnerHtml: testFramework =>
				`<!DOCTYPE html>
				<html lang="en">
					<body>
						<script>
							window.addEventListener('error', (err) => {
								if (err.message.includes('ResizeObserver')) {
									err.stopImmediatePropagation();
								}
							});
						</script>
						<script type="module" src="${testFramework}"></script>
					</body>
				</html>`,
		};
	}

	get visualDiffGroup() {
		return {
			name: 'vdiff',
			files: this.#getPattern('vdiff'),
			browsers: ['chrome'],
			testRunnerHtml: testFramework =>
				`<!DOCTYPE html>
				<html lang="en">
					<head>
						<link rel="preload" href="https://s.brightspace.com/lib/fonts/0.5.0/assets/Lato-400.woff2" as="font" type="font/woff2" crossorigin>
						<link rel="preload" href="https://s.brightspace.com/lib/fonts/0.5.0/assets/Lato-700.woff2" as="font" type="font/woff2" crossorigin>
						<style>
							@font-face {
								font-family: 'Lato';
								font-style: normal;
								font-weight: 400;
								src: url(https://s.brightspace.com/lib/fonts/0.5.0/assets/Lato-400.woff2) format('woff2');
							}
							@font-face {
								font-family: 'Lato';
								font-style: normal;
								font-weight: 700;
								src: url(https://s.brightspace.com/lib/fonts/0.5.0/assets/Lato-700.woff2) format('woff2');
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
								padding: 30px;
							}
						</style>
					</head>
					<body>
						<script type="module" src="${testFramework}"></script>
					</body>
				</html>`
		};
	}

	#getMochaConfig(timeoutConfig) {
		const {
			timeout = timeoutConfig,
			grep,
			watch,
			manual
		} = this.#cliArgs;

		if (typeof timeout !== 'undefined' && typeof timeout !== 'number') throw new TypeError('timeout must be a number');

		const config = {};

		if (timeout) config.timeout = String(timeout);
		if (watch || manual) config.timeout = '0';
		if (grep) config.grep = grep;

		return Object.keys(config).length && { testFramework: { config } };
	}

	#getPattern(type) {
		const pattern = [].concat(this.#cliArgs.files || this.pattern(type));

		// replace filename wildcards with all filter strings
		// e.g. If filter is ['button', 'list'], pattern './test/*.test.*' becomes:
		// [ './test/+(*button*.test.*|*.test.*button*)', './test/+(*list*.test.*|*.test.*list*)' ]
		if (this.#cliArgs.filter) {
			return this.#cliArgs.filter.map(filterStr => {
				// replace everything after the last forward slash
				return pattern.map(p => p.replace(/[^/]*$/, fileGlob => {
					// create a new glob for each wildcard
					const fileGlobs = Array.from(fileGlob.matchAll(/(?<!\*)\*(?!\*)/g)).map(({ index }) => {
						const arr = fileGlob.split('');
						arr.splice(index, 1, filterStr);
						return arr.join('');
					});
					return `+(${fileGlobs.join('|') || fileGlob})`;
				}));
			}).flat();
		}
		return pattern;
	}

	create({
		pattern = DEFAULT_PATTERN,
		timeout,
		...passthroughConfig
	} = {}) {
		const { files, filter, golden, grep, group, manual, watch } = this.#cliArgs;

		delete passthroughConfig.browsers;

		if (typeof pattern !== 'function') throw new TypeError('pattern must be a function');
		this.pattern = pattern;

		const config = {
			...this.#defaultConfig,
			...this.#getMochaConfig(timeout),
			...passthroughConfig
		};

		config.groups ??= [];
		config.groups.push({
			name: 'unit',
			files: this.#getPattern('test')
		});

		if (group === 'vdiff') {
			config.reporters ??= [ defaultReporter() ];
			config.reporters.push(visualDiffReporter({ reportResults: !golden }));

			config.plugins ??= [];
			config.plugins.push(visualDiff({ updateGoldens: golden, runSubset: !!(filter || grep) }));

			config.groups.push(this.visualDiffGroup);
		}

		// convert all browsers to playwright
		config.groups.forEach(g => g.browsers = this.getBrowsers(g.browsers));

		if (watch || manual) {
			config.plugins ??= [];
			const currentPattern = files || config.groups.find(g => g.name === group)?.files || config.files;

			config.plugins.push(headedMode({
				pattern: currentPattern,
				manual,
				watch
			}));
		}

		return config;
	}

	getBrowsers(browsers) {
		browsers = this.#requestedBrowsers || browsers || ALLOWED_BROWSERS;

		if (!Array.isArray(browsers)) throw new TypeError('browsers must be an array');

		return browsers.map((b) => playwrightLauncher({
			concurrency: b === 'firefox' ? 1 : undefined, // focus in Firefox unreliable if concurrency > 1 (https://github.com/modernweb-dev/web/issues/238)
			product: BROWSER_MAP[b],
			createBrowserContext: ({ browser }) => browser.newContext({ deviceScaleFactor: 2, reducedMotion: 'reduce' })
		}));
	}

}
