import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

let test, timeout;

chai.Assertion.addMethod('golden', function(...args) {
	return ScreenshotAndCompare.call({ test, timeout, elem: this._obj }, ...args); // eslint-disable-line no-invalid-this
});
mocha.setup({ // eslint-disable-line no-undef
	rootHooks: {
		beforeEach() {
			test = this.currentTest;
			timeout = this.timeout;
		}
	}
});

async function ScreenshotAndCompare(opts) {
	const name = this.test.fullTitle();
	const rect = this.elem.getBoundingClientRect();
	let results = await executeServerCommand('brightspace-visual-diff', { name, rect, opts });
	if (results.differentSizes) {
		this.timeout('100000');
		results = await executeServerCommand('brightspace-visual-diff-compare-different-sizes', { name });
	}
	if (!results.pass) {
		expect.fail(results.message);
	}
}
