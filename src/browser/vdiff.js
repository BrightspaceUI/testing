import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

let test;

chai.Assertion.addMethod('golden', function(...args) {
	return ScreenshotAndCompare.call({ test, elem: this._obj }, ...args); // eslint-disable-line no-invalid-this
});
mocha.setup({ // eslint-disable-line no-undef
	rootHooks: {
		beforeEach() {
			test = this.currentTest;
		}
	}
});

async function ScreenshotAndCompare(opts) {
	const name = this.test.fullTitle();
	const rect = this.elem.getBoundingClientRect();
	let result = await executeServerCommand('brightspace-visual-diff-compare', { name, rect, opts });
	if (result.resizeRequired) {
		this.test.timeout(0);
		result = await executeServerCommand('brightspace-visual-diff-compare-resize', { name });
	}
	if (!result.pass) {
		expect.fail(result.message);
	}
}
