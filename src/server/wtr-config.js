import { argv } from 'node:process';
import { defaultReporter } from '@web/test-runner';
import { playwrightLauncher } from '@web/test-runner-playwright';

const DEFAULT_PATTERN = type => `./test/**/*.${type}.js`;
const DEFAULT_VDIFF = false;
const ALLOWED_BROWSERS = ['chromium', 'firefox', 'webkit'];

export class WTRConfig {

	static #singleton;
	#cliArgs = [];

	constructor() {
		if (!this.constructor.#singleton) {
			this.constructor.#singleton = this;

			const sgtn = this.constructor.#singleton;
			sgtn.cliArgs = argv;
		}
		return this.constructor.#singleton;
	}

	set cliArgs(cliArgs) {
		this.#cliArgs = cliArgs;
		this.requestedBrowsers = this.#requestedBrowsers;
	}

	getBrowsers(browsers) {
		browsers = this.requestedBrowsers || browsers || ALLOWED_BROWSERS;

		if (!Array.isArray(browsers)) throw new TypeError('browsers must be an array');

		return browsers.map((b) => playwrightLauncher({
			product: b,
			createBrowserContext: ({ browser }) => browser.newContext({ deviceScaleFactor: 2, reducedMotion: 'reduce' })
		}));
	}

	get #requestedBrowsers() {
		return this.#cliArgs.toString().match(new RegExp(ALLOWED_BROWSERS.join('|'), 'gi'));
	}

	create({
		pattern = DEFAULT_PATTERN,
		vdiff = DEFAULT_VDIFF,
		timeout,
		...passthroughConfig
	} = {}) {
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
			files: pattern('test'),
			nodeResolve: true,
			testRunnerHtml: testFramework =>
				`<html lang="en">
					<body>
						<script src="./tools/resize-observer-test-error-handler.js"></script>
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
			files: pattern('test'),
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

	get visualDiffGroup() {
		return {
			name: 'vdiff',
			files: this.pattern('vdiff'),
			browsers: this.getBrowsers(['chromium']),
			testRunnerHtml: testFramework =>
				`<html lang="en">
					<head>
						<link rel="preload" href="https://s.brightspace.com/lib/fonts/0.5.0/assets/Lato-400.woff2" as="font" type="font/woff2" crossorigin>
						<link rel="preload" href="https://s.brightspace.com/lib/fonts/0.5.0/assets/Lato-700.woff2" as="font" type="font/woff2" crossorigin>
						<style>
							html {
								font-size: 20px;
							}
							body {
								background-color: #ffffff;
								margin: 0;
								padding: 30px;
							}
							body[data-theme="dark"] {
								background-color: #000000;
							}
							body[data-theme="translucent"] {
								background: repeating-linear-gradient(45deg, #606dbc, #606dbc 10px, #465298 10px, #465298 20px);
							}
						</style>
						<script type="module" src="./components/typography/typography.js"></script>
					</head>
					<body class="d2l-typography">
						<script type="module" src="${testFramework}"></script>
					</body>
				</html>`
		};
	}

}

export function createConfig(...args) {

	if (!argv.includes('--group') || argv.includes('default')) {
		if (argv.includes('--playwright')) {
			console.warn('Warning: reducedMotion disabled. Use the unit group to enable reducedMotion.');
		} else {
			console.warn('Warning: Running with puppeteer, reducedMotion disabled. Use the unit group to use playwright with reducedMotion enabled');
		}
	}

	const wtrConfig = new WTRConfig();
	return wtrConfig.create(...args);
}

export function getBrowsers(browsers) {
	const wtrConfig = new WTRConfig();
	return wtrConfig.getBrowsers(browsers);
}
