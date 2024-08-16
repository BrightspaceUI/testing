import { expect } from '../../src/browser/index.js';

describe('environment', () => {

	it('should set isD2LTestPage', async() => {
		expect(window.isD2LTestPage).to.be.true;
	});

});
