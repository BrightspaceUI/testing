import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { PATHS } from '../visual-diff-plugin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
	input: join(__dirname, 'index.html'),
	output: {
		dir: PATHS.VDIFF_ROOT
	},
	plugins: [
		html(),
		nodeResolve()
	],
};
