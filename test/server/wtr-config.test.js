import { assert, match, restore, spy, stub } from 'sinon/pkg/sinon-esm.js';
import { createConfig, getBrowsers, WTRConfig } from '../../src/server/wtr-config.js';
import { createConfig as createConfigPublic, getBrowsers as getBrowsersPublic } from '../../src/server/index.js';
import { expect } from 'chai';

describe('createWtrConfig', () => {

	afterEach(() => {
		restore();
	});

	describe('createConfig()', () => {

		it('should be exported from index', () => {
			expect(createConfig).to.equal(createConfigPublic);
		});

		it('calls WTRConfig.create', () => {
			const createStub = stub(WTRConfig.prototype, 'create').callsFake(num => num / 2);
			const res = createConfig(10);

			assert.calledOnce(createStub);
			assert.calledWith(createStub, 10);
			expect(res).to.equal(5);
		});
	});

	describe('WTRConfig()', () => {
		it('should not be exported from index', async() => {
			const res = (await import('../../src/server/index.js')).WTRConfig;
			expect(res).to.be.undefined;
		});
	});

	describe('WTRConfig.create()', () => {

		let config, wtrConfig;
		before(() => {
			wtrConfig = new WTRConfig();
			config = wtrConfig.create();
		});

		it('should warn about not using a group', () => {
			const consoleSpy = spy(console, 'warn');
			wtrConfig.create();
			assert.calledOnce(consoleSpy);
			assert.calledWith(consoleSpy, match('puppeteer'));
		});

		it('should warn about using the default group', () => {
			const consoleSpy = spy(console, 'warn');
			wtrConfig = new WTRConfig(['--group', 'default']);
			wtrConfig.create();
			assert.calledOnce(consoleSpy);
			assert.calledWith(consoleSpy, match('puppeteer'));
		});

		it('should warn about not using a group with playwright', () => {
			const consoleSpy = spy(console, 'warn');
			wtrConfig = new WTRConfig(['--playwright']);
			wtrConfig.create();
			assert.calledOnce(consoleSpy);
			assert.calledWith(consoleSpy, match('Warning: reducedMotion disabled.'));
		});

		it('should enable nodeResolve', () => {
			expect(config.nodeResolve).to.be.true;
		});

		it('should not configure a timeout by default', () => {
			expect(config.testFramework).to.be.undefined;
		});

		it('should set timeout when provided with a timeout value', () => {
			const config = wtrConfig.create({ timeout: 3000 });
			expect(config.testFramework).to.not.be.undefined;
			expect(config.testFramework.config).to.not.be.undefined;
			expect(config.testFramework.config.timeout).to.equal('3000');
		});

		it('should set a common default files pattern', () => {
			expect(config.files).to.equal('./test/**/*.test.js');
		});

		it('should run a given pattern function to set files', () => {
			const config = wtrConfig.create({ pattern: type => `./a/b.${type}.js` });
			expect(config.files).to.equal('./a/b.test.js');
		});

		it('should create a unit test group by default', () => {
			expect(config.groups).to.be.an('array');
			expect(config.groups.map(g => g.name)).to.have.members(['unit']);
		});

		it('should not enable vdiff by default', () => {
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(config.groups[0]).to.not.have.property('name', 'vdiff');
		});

	});

	describe('getBrowsers()', () => {

		it('should be exported from index', () => {
			expect(getBrowsers).to.equal(getBrowsersPublic);
		});

		it('calls WTRConfig.getBrowsers', () => {
			const getBrowsersStub = stub(WTRConfig.prototype, 'getBrowsers').callsFake(num => num / 2);
			const res = getBrowsers(10);

			assert.calledOnce(getBrowsersStub);
			assert.calledWith(getBrowsersStub, 10);
			expect(res).to.equal(5);
		});
	});

	describe('WTRConfig.getBrowsers()', () => {

		let browsers, wtrConfig;
		before(() => {
			wtrConfig = new WTRConfig();
			browsers = wtrConfig.getBrowsers();
		});

		it('should default to chromium, firefox, webkit for unit group', () => {
			expect(browsers).to.be.an('array');
			expect(browsers.map(b => b.name)).to.have.members(['Chromium', 'Firefox', 'Webkit']);
		});

		it('should use playwrightLauncher for all browsers', () => {
			browsers.forEach(b => expect(b.constructor.name).to.equal('PlaywrightLauncher'));
		});

		it('should use browsers passed as arguments', () => {
			const browsers = wtrConfig.getBrowsers(['webkit']);
			expect(browsers).to.have.length(1);
			expect(browsers[0].name).to.equal('Webkit');
		});

		it('should only use CLI browsers when provided', () => {
			const wtrConfig = new WTRConfig(['a', 'firefox', 'webkit', 'b']);
			const browsers = wtrConfig.getBrowsers(['chromium']);
			expect(browsers).to.have.length(2);
			expect(browsers.map(b => b.name)).to.have.members(['Webkit', 'Firefox']);
		});

	});
});
