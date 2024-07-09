#!/usr/bin/env node
import { PATHS } from '../../paths.js';
import { startDevServer } from '@web/dev-server';

export const report = {
	start() {
		return startDevServer({
			config: {
				nodeResolve: false,
				open: `./${PATHS.REPORT_ROOT}/`,
				rootDir: `${PATHS.VDIFF_ROOT}`,
				preserveSymlinks: false,
				watch: true
			},
			readCliArgs: false,
			readFileConfig: false
		});
	}
};
