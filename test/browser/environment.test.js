import { expect } from '../../src/browser/index.js';

describe('environment', () => {

	it('should set isD2LTestPage', async() => {
		expect(window.isD2LTestPage).to.be.true;
	});

	it('should default to "en-us" locale', async() => {
		// Firefox always returns the region portion in uppercase
		// https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language
		expect(navigator.language.toLowerCase()).to.equal('en-us');
	});

});
