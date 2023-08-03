#!/usr/bin/env node
import { bailOn } from '../../bail.js';
import { PATHS } from '../../visual-diff-plugin.js';
import { startDevServer } from '@web/dev-server';

bailOn('report') ||

await startDevServer({
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
