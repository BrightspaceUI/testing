import { chai } from '@open-wc/testing';
import { ALT_TESTS, allColorModes } from '../alt-tests';

chai.Assertion.overwriteMethod('accessible', function(_super) {
	return async function(opts = {}) {
		console.log(opts);
		let violationsHeader = '';
		const violationsMessages = [];
		const run = async(prefix = '') => {
			try {
				await _super.apply(this, arguments);
			} catch(e) {
				const violations = e.message.split('---');
				violationsHeader = violations.shift();
				violations.pop();
				violationsMessages.push(...violations.map(v => `${prefix}${v}`));
			}
		}
		await run();
		if (opts.allColorModes) {
			for (const mode of allColorModes) {
				ALT_TESTS[mode].set();
				await run(`\nColor mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
				ALT_TESTS[mode].reset();
			}
		}
		if (violationsMessages.length > 0) {
			violationsMessages.unshift(violationsHeader);
			violationsMessages.push('---');
			throw new Error(violationsMessages.join('---'));
		}

	};
});
