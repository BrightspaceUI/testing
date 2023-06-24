import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

mocha.setup({ // eslint-disable-line no-undef
	rootHooks: {
		beforeEach() {
			const { currentTest } = this;
			chai.Assertion.addMethod('golden', function(...args) {
				return ScreenshotAndCompare(currentTest, this._obj, ...args); // eslint-disable-line no-invalid-this
			});
		}
	}
});

async function ScreenshotAndCompare(test, elem, opts) {
	const name = test.fullTitle();
	const rect = elem.getBoundingClientRect();
	const { pass, message } = await executeServerCommand('brightspace-visual-diff', { name, rect, opts });
	if (!pass) {
		expect.fail(message);
	}
}
