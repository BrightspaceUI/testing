
import { createWtrConfig } from '../src/index.js';
import { expect } from '@open-wc/testing';

describe('createWtrConfig', () => {

	it('should enable nodeResolve', () => {
		const config = createWtrConfig();
		expect(config.nodeResolve).to.be.true;
	});

	it('should not configure a timeout by default', () => {
		const config = createWtrConfig();
		expect(config.testFramework).to.be.undefined;
	});

	it('should not configure a timeout if the default is provided', () => {
		const config = createWtrConfig({ timeout: 2000 });
		expect(config.testFramework).to.be.undefined;
	});

	it('should set timeout when provided value differs from the default', () => {
		const config = createWtrConfig({ timeout: 3000 });
		expect(config.testFramework).to.not.be.undefined;
		expect(config.testFramework.config).to.not.be.undefined;
		expect(config.testFramework.config.ui).to.equal('bdd');
		expect(config.testFramework.config.timeout).to.equal('3000');
	});

});
