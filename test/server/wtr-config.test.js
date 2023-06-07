import { createConfig } from '../../src/index.js';
import { expect } from 'chai';

describe('createConfig', () => {

	it('should enable nodeResolve', () => {
		const config = createConfig();
		expect(config.nodeResolve).to.be.true;
	});

	it('should not configure a timeout by default', () => {
		const config = createConfig();
		expect(config.testFramework).to.be.undefined;
	});

	it('should set timeout when provided with a timeout value', () => {
		const config = createConfig({ timeout: 3000 });
		expect(config.testFramework).to.not.be.undefined;
		expect(config.testFramework.config).to.not.be.undefined;
		expect(config.testFramework.config.timeout).to.equal('3000');
	});

});
