import { cwd } from 'node:process';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import { join } from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { PATHS } from './paths.js';

export default {
	input: join(cwd(), PATHS.VDIFF_ROOT, PATHS.REPORT_ROOT, './temp/index.html'),
	output: {
		dir: join(PATHS.VDIFF_ROOT, PATHS.REPORT_ROOT)
	},
	plugins: [
		html(),
		nodeResolve()
	],
};
