import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

chai.Assertion.addMethod('golden', ScreenshotAndCompare);

async function ScreenshotAndCompare(name, opts) {
	const elem = this._obj;
	const rect = elem.getBoundingClientRect();
	const { pass, message } = await executeServerCommand('brightspace-visual-diff', { name, rect, opts });
	if (!pass) {
		expect.fail(message);
	}
}
