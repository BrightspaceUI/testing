import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

chai.Assertion.addMethod('golden', ScreenshotAndCompare);

async function ScreenshotAndCompare(testInfo, opts) {
	const elem = this._obj;
	const rect = elem.getBoundingClientRect();
	let results = await executeServerCommand('brightspace-visual-diff-compare', { name: testInfo.test.fullTitle(), rect, opts });
	if (results.differentSizes) {
		testInfo.timeout('100000');
		results = await executeServerCommand('brightspace-visual-diff-compare-different-sizes', { name: testInfo.test.fullTitle() });
	}
	if (!results.pass) {
		expect.fail(results.message);
	}
}
