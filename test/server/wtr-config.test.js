import { createConfig, getBrowsers } from '../../src/index.js';
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

	it('should set a common default files pattern', () => {
		const config = createConfig();
		expect(config.files).to.equal('./test/**/*.test.js');
	});

	it('should run a given pattern function to set files', () => {
		const config = createConfig({ pattern: type => `./a/b.${type}.js` });
		expect(config.files).to.equal('./a/b.test.js');
	});

	it('should create a unit test group by default', () => {
		const config = createConfig();
		expect(config.groups).to.be.an('array');
		expect(config.groups.map(g => g.name)).to.have.members(['unit']);
	});

	it('should not enable vdiff by default', () => {
		const config = createConfig();
		expect(config.groups).to.be.an('array');
		expect(config.groups.map(g => g.name)).to.not.have.members(['vdiff']);
	});

});

describe('getBrowsers', () => {

	let browsers;
	before(() => {
		browsers = getBrowsers();
	});

	it('should default to chromium, firefox, webkit for unit group', () => {
		expect(browsers).to.be.an('array');
		expect(browsers.map(b => b.name)).to.have.members(['Chromium', 'Firefox', 'Webkit']);
	});

	it('should use playwrightLauncher for all browsers', () => {
		browsers.forEach(b => expect(b.constructor.name).to.equal('PlaywrightLauncher'));
	});

	it('should use browsers passed as arguments', () => {
		const browsers = getBrowsers(['webkit']);
		expect(browsers).to.have.length(1);
		expect(browsers[0].name).to.equal('Webkit');
	});

});
