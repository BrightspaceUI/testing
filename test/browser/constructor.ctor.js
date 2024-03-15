import { defineCE, expect, oneEvent, runConstructor } from '../../src/browser/index.js';

describe('constructor', () => {

	it('should fail if element is not defined', () => {
		expect(() => runConstructor('not-defined'))
			.to.not.throw('expected undefined not to be undefined');
	});

	it('should fail if element\'s constructor throws', async() => {
		const tag = defineCE(class extends HTMLElement {
			constructor() {
				super();
				throw new Error('expected error');
			}
		});
		setTimeout(() => runConstructor(tag));
		await oneEvent(window, 'd2l-test-runner-expected-error');
	});

	it('should pass otherwise', () => {
		const tag = defineCE(class extends HTMLElement {});
		runConstructor(tag);
	});

});
