const DEFAULT_TIMEOUT = 2000;

export function createWtrConfig(opts) {

	opts = opts || {};
	opts.timeout = opts.timeout || DEFAULT_TIMEOUT;

	const config = {
		files: 'test/**/*.test.js',
		nodeResolve: true
	};

	if (opts.timeout !== DEFAULT_TIMEOUT) {
		config.testFramework = {
			config: {
				ui: 'bdd',
				timeout: opts.timeout.toString(),
			}
		};
	}

	return config;

}
