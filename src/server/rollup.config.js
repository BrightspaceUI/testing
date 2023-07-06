import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import { join } from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { PATHS } from './visual-diff-plugin.js';

export default {
	input: join(PATHS.VDIFF_ROOT, './report/temp/index.html'),
	output: {
		dir: join(PATHS.VDIFF_ROOT, 'report')
	},
	plugins: [
		html(),
		nodeResolve()
	],
};
