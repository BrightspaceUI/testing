import { createConfig, getBrowsers, getRequestedBrowsers, WTRConfig } from '../../src/server/wtr-config.js';
import { createConfig as createConfigPublic, getBrowsers as getBrowsersPublic } from '../../src/index.js';
import { expect } from 'chai';
import sinon from 'sinon/pkg/sinon-esm.js';

describe('createConfig()', () => {

	it('should be exported from index', () => {
		expect(createConfig).to.equal(createConfigPublic);
	});

	it('makes the right calls', () => {
		const createSpy = sinon.spy(WTRConfig.prototype, 'create');
		createConfig(1);

		sinon.assert.calledOnce(createSpy);
		sinon.assert.calledWith(createSpy, 1);

		createSpy.restore();
	});
});

describe('WTRConfig()', () => {
	it('should not be exported from index', async() => {
		const res = (await import('../../src/index.js')).WTRConfig;
		expect(res).to.be.undefined;
	});
});

describe('WTRConfig.create()', () => {

	let create, config;
	before(() => {
		create = (new WTRConfig()).create;
		config = create();
	});

	it('should enable nodeResolve', () => {
		expect(config.nodeResolve).to.be.true;
	});

	it('should not configure a timeout by default', () => {
		expect(config.testFramework).to.be.undefined;
	});

	it('should set timeout when provided with a timeout value', () => {
		const config = create({ timeout: 3000 });
		expect(config.testFramework).to.not.be.undefined;
		expect(config.testFramework.config).to.not.be.undefined;
		expect(config.testFramework.config.timeout).to.equal('3000');
	});

	it('should set a common default files pattern', () => {
		expect(config.files).to.equal('./test/**/*.test.js');
	});

	it('should run a given pattern function to set files', () => {
		const config = create({ pattern: type => `./a/b.${type}.js` });
		expect(config.files).to.equal('./a/b.test.js');
	});

	it('should create a unit test group by default', () => {
		expect(config.groups).to.be.an('array');
		expect(config.groups.map(g => g.name)).to.have.members(['unit']);
	});

	it('should not enable vdiff by default', () => {
		expect(config.groups).to.be.an('array');
		expect(config.groups.map(g => g.name)).to.not.have.members(['vdiff']);
	});

});

describe('getBrowsers()', () => {

	let browsers;
	before(() => {
		browsers = getBrowsers();
	});

	it('should be exported from index', () => {
		expect(getBrowsers).to.equal(getBrowsersPublic);
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

	it('should use requestedBrowsers if provided', () => {
		new WTRConfig(['a', 'firefox', 'webkit', 'b']);

		const browsers = getBrowsers();
		expect(browsers).to.have.length(2);
		expect(browsers.map(b => b.name)).to.have.members(['Webkit', 'Firefox']);

		new WTRConfig();
	});

});

describe('getRequestedBrowsers()', () => {

	it('should not be exported from index', async() => {
		const res = (await import('../../src/index.js')).getRequestedBrowsers;
		expect(res).to.be.undefined;
	});

	it('should return null with no --browsers option set', () => {
		const requestedBrowsers = getRequestedBrowsers();
		expect(requestedBrowsers).to.be.null;
	});

	it('should return allowed browsers set via --browsers option', () => {
		const requestedBrowsers = getRequestedBrowsers(['a', 'webkit', 'b']);
		expect(requestedBrowsers).to.be.have.members(['webkit']);
	});

});
