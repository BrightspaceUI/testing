import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

mocha.setup({ // eslint-disable-line no-undef
	rootHooks: {
		beforeEach() {
			chai.Assertion.addMethod('golden',
				(test => function(...args) {
					return ScreenshotAndCompare.call(test, this._obj, ...args); // eslint-disable-line no-invalid-this
				})(this.currentTest));
		}
	}
});

async function ScreenshotAndCompare(elem, opts) {
	const name = this.fullTitle();
	const rect = elem.getBoundingClientRect();
	const { pass, message } = await executeServerCommand('brightspace-visual-diff', { name, rect, opts });
	if (!pass) {
		expect.fail(message);
	}
}
