import { executeServerCommand } from '@web/test-runner-commands';
import { expect } from '@open-wc/testing';

export async function screenshotAndCompare(elem, name, opts) {
	const rect = elem.getBoundingClientRect();
	const { pass, message } = await executeServerCommand('brightspace-visual-diff', { name, rect, opts });
	if (!pass) {
		expect.fail(message);
	}
}
