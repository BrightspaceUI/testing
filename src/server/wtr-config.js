import commandLineArgs from 'command-line-args';
import { defaultReporter } from '@web/test-runner';
import { headedMode } from './headed-mode-plugin.js';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { visualDiff } from './visual-diff-plugin.js';

const optionDefinitions = [
	// @web/test-runner options
	{ name: 'files', type: String, multiple: true },
	{ name: 'group', type: String },
	{ name: 'manual', type: Boolean },
	{ name: 'playwright', type: Boolean },
	{ name: 'watch', type: Boolean },
	// custom options
	{ name: 'chromium', type: Boolean },
	{ name: 'filter', alias: 'f', type: String, multiple: true },
	{ name: 'firefox', type: Boolean },
	{ name: 'golden', type: Boolean },
	{ name: 'grep', alias: 'g', type: String },
	{ name: 'timeout', type: Number },
	{ name: 'webkit', type: Boolean },
];

const cliArgs = commandLineArgs(optionDefinitions, { partial: true });

const DEFAULT_PATTERN = type => `./test/**/*.${type}.js`;
const DEFAULT_VDIFF = false;
const ALLOWED_BROWSERS = ['chromium', 'firefox', 'webkit'];

export class WTRConfig {

	#cliArgs;
	#requestedBrowsers;

	constructor(cliArgs) {
		this.#cliArgs = cliArgs || {};
		const requestedBrowsers = ALLOWED_BROWSERS.filter(b => cliArgs?.[b]);
		this.#requestedBrowsers = requestedBrowsers.length && requestedBrowsers;
	}

	get #defaultConfig() {
		return {
			files: this.#getPattern('test'),
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
			browsers: this.getBrowsers(['chromium']),
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
								font-family: 'Lato';
								letter-spacing: 0.01rem;
								font-size: 0.95rem;
								font-weight: 400;
								line-height: 1.4rem;
								margin: 0;
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
		const pattern = this.#cliArgs.files || this.pattern(type);

		// replace filename wildcards with all filter strings
		// e.g. If filter is ['button', 'list'], pattern './test/*.test.*' becomes:
		// [ './test/+(*button*.test.*|*.test.*button*)', './test/+(*list*.test.*|*.test.*list*)' ]
		if (this.#cliArgs.filter) {
			return this.#cliArgs.filter.map(filterStr => {
				// replace everything after the last forward slash
				return pattern.replace(/[^/]*$/, fileGlob => {
					// create a new glob for each wildcard
					const fileGlobs = Array.from(fileGlob.matchAll(/(?<!\*)\*(?!\*)/g)).map(({ index }) => {
						const arr = fileGlob.split('');
						arr.splice(index, 1, `*${filterStr}*`);
						return arr.join('');
					});
					return `+(${fileGlobs.join('|')})`;
				});
			});
		}
		return pattern;
	}

	create({
		pattern = DEFAULT_PATTERN,
		vdiff = DEFAULT_VDIFF,
		timeout,
		...passthroughConfig
	} = {}) {

		const { watch, manual, group, files, playwright	} = this.#cliArgs;

		if (!group || group === 'default') {
			if (playwright) {
				console.warn('Warning: reducedMotion disabled. Use the unit group to enable reducedMotion.');
			} else {
				console.warn('Warning: Running with puppeteer, reducedMotion disabled. Use the unit group to use playwright with reducedMotion enabled');
			}
		}

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
			files: this.#getPattern('test'),
			browsers: this.getBrowsers()
		});

		if (vdiff) {
			config.reporters ??= [ defaultReporter() ];
			//config.reporters.push(visualDiffReporter());

			config.plugins ??= [];
			config.plugins.push(visualDiff({ updateGoldens: this.#cliArgs.golden }));

			config.groups.push(this.visualDiffGroup);
		}

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
			product: b,
			createBrowserContext: ({ browser }) => browser.newContext({ deviceScaleFactor: 2, reducedMotion: 'reduce' })
		}));
	}

}

export function createConfig(...args) {
	const wtrConfig = new WTRConfig(cliArgs);
	return wtrConfig.create(...args);
}

export function getBrowsers(browsers) {
	const wtrConfig = new WTRConfig(cliArgs);
	return wtrConfig.getBrowsers(browsers);
}
