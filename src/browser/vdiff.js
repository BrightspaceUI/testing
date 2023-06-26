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
	const { pass, message } = await executeServerCommand('brightspace-visual-diff', { name, rect, opts });
	if (!pass) {
		expect.fail(message);
	}
}
