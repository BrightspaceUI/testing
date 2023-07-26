import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

let test;

/* eslint-disable no-undef, no-invalid-this */
chai.Assertion.addMethod('golden', function(...args) {
	return ScreenshotAndCompare.call({ test, elem: this._obj }, ...args);
});
mocha.setup({
	rootHooks: {
		beforeEach() {
			test = this.currentTest;
		}
	}
});
/* eslint-enable */

async function ScreenshotAndCompare(opts) {
	const name = this.test.fullTitle();
	const rect = this.elem.getBoundingClientRect();
	const slowDuration = this.test.slow();
	let result = await executeServerCommand('brightspace-visual-diff-compare', { name, rect, slowDuration, opts });
	if (result.resizeRequired) {
		this.test.timeout(0);
		result = await executeServerCommand('brightspace-visual-diff-compare-resize', { name });
	}
	if (!result.pass) {
		expect.fail(result.message);
	}
}
