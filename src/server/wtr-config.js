import commandLineArgs from 'command-line-args';
import { defaultReporter } from '@web/test-runner';
import { playwrightLauncher } from '@web/test-runner-playwright';

const optionDefinitions = [
	{ name: 'playwright', type: Boolean },
	{ name: 'files', type: String, multiple: true, defaultOption: true },
	{ name: 'group', type: String },
	{ name: 'grep', alias: 'g', type: String, multiple: true }
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
		this.#requestedBrowsers = this.#cliArgs?.browsers?.filter(b => ALLOWED_BROWSERS.includes(b));
	}

	get visualDiffGroup() {
		return {
			name: 'vdiff',
			files: this.#getPattern('vdiff'),
			browsers: this.getBrowsers(['chromium']),
			testRunnerHtml: testFramework =>
				`<html lang="en">
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

	#getPattern(type) {
		const pattern = this.pattern(type);

		// replace filename wildcards with all grep strings
		// e.g. ./**/test/*.test.* becomes ./**/test/(*grepString*.test.*|*.test.*grepString*)
		if (this.#cliArgs.grep) {
			return this.#cliArgs.grep?.map(grepStr => {
				return pattern.replace(/([^/]*$)/, fileGlob => {
					const fileGlobs = Array.from(fileGlob.matchAll(/(?<!\*)\*(?!\*)/g)).map(m => {
						const arr = m.input.split('');
						arr.splice(m.index, 1, `*${grepStr}*`);
						return arr.join('');
					});
					return `(${fileGlobs.join('|')})`;
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

		if (!this.#cliArgs.group || this.#cliArgs.group === 'default') {
			if (this.#cliArgs.playwright) {
				console.warn('Warning: reducedMotion disabled. Use the unit group to enable reducedMotion.');
			} else {
				console.warn('Warning: Running with puppeteer, reducedMotion disabled. Use the unit group to use playwright with reducedMotion enabled');
			}
		}

		delete passthroughConfig.browsers;
		this.pattern = pattern;

		if (typeof pattern !== 'function') throw new TypeError('pattern must be a function');

		const timeoutConfig = {};

		if (typeof timeout !== 'undefined') {
			if (typeof timeout !== 'number') throw new TypeError('timeout must be a number');

			timeoutConfig.testFramework = {
				config: {
					timeout: timeout.toString()
				}
			};
		}

		const defaultConfig = {
			files: this.#getPattern('test'),
			nodeResolve: true,
			testRunnerHtml: testFramework =>
				`<html lang="en">
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

		const config = {
			...defaultConfig,
			...timeoutConfig,
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
			//config.plugins.push(visualDiff());

			config.groups.push(this.visualDiffGroup);
		}

		return config;
	}

	getBrowsers(browsers) {
		browsers = this.#requestedBrowsers || browsers || ALLOWED_BROWSERS;

		if (!Array.isArray(browsers)) throw new TypeError('browsers must be an array');

		return browsers.map((b) => playwrightLauncher({
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
