import { argv } from 'node:process';
import { createConfig } from '../../src/server/wtr-config.js';

const pattern = type => `test/vdiff/*.${type}.js`;

function getGoldenFlag() {
	return {
		name: 'vdiff-get-golden-flag',
		async executeCommand({ command }) {
			if (command !== 'vdiff-get-golden-flag') return;
			return argv.indexOf('--golden') > -1;
		}
	};
}

export default createConfig({
	pattern,
	vdiff: true,
	plugins: [getGoldenFlag()]
});
