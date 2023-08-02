#!/usr/bin/env node
import { PATHS } from '../src/server/visual-diff-plugin.js';
import { startDevServer } from '@web/dev-server';

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
