import { argv } from 'node:process';

function getGoldenFlag() {
	return {
		name: 'vdiff-get-golden-flag',
		async executeCommand({ command }) {
			if (command !== 'vdiff-get-golden-flag') return;
			return argv.indexOf('--golden') > -1;
		}
	};
}

export default {
	pattern: () => 'test/browser/**/*.vdiff.js',
	plugins: [getGoldenFlag()]
};