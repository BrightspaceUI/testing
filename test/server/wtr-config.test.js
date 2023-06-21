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
			const wtrConfig = new WTRConfig({ group: 'default' });
			wtrConfig.create();
			assert.calledOnce(consoleSpy);
			assert.calledWith(consoleSpy, match('puppeteer'));
		});

		it('should warn about not using a group with playwright', () => {
			const consoleSpy = spy(console, 'warn');
			const wtrConfig = new WTRConfig({ playwright: true });
			wtrConfig.create();
			assert.calledOnce(consoleSpy);
			assert.calledWith(consoleSpy, match('Warning: reducedMotion disabled.'));
		});

		it('should enable nodeResolve', () => {
			expect(config.nodeResolve).to.be.true;
		});

		it('should not configure testFramework by default', () => {
			expect(config.testFramework).to.be.undefined;
		});

		it('should configure testFramework when provided with a timeout value', () => {
			const config = wtrConfig.create({ timeout: 3000 });
			expect(config.testFramework).to.not.be.undefined;
			expect(config.testFramework.config).to.not.be.undefined;
			expect(config.testFramework.config.timeout).to.equal('3000');
		});

		it('should set timeout from CLI when provided', () => {
			const wtrConfig = new WTRConfig({ timeout: 4000 });
			const config = wtrConfig.create({ timeout: 3000 });
			expect(config.testFramework.config.timeout).to.equal('4000');
		});

		it('should set timeout to 0 and add headedMode plugin when headed', () => {
			['watch', 'manual'].forEach(mode => {
				const wtrConfig = new WTRConfig({ timeout: 4000, [mode]: true });
				const config = wtrConfig.create({ timeout: 3000 });
				expect(config.plugins).to.have.length(1);
				expect(config.testFramework.config.timeout).to.equal('0');
			});
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

		it('should not configure vdiff by default', () => {
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(config.plugins).to.be.undefined;
			expect(config.groups.find(g => g.name === 'vdiff')).to.be.undefined;
		});

		it('should configure vdiff when enabled', () => {
			const config = wtrConfig.create({ vdiff: true });
			expect(config.groups).to.be.an('array').that.has.length(2);
			expect(config.plugins).to.be.an('array').that.has.length(1);
			expect(config.groups[1]).to.have.property('name', 'vdiff');
		});

		it('should filter test files using --filter values', () => {
			const wtrConfig = new WTRConfig({ filter: ['subset', 'subset2'] });
			const config = wtrConfig.create({ pattern: type => `./test/**/*/*.${type}.*` });
			expect(config.files).to.have.length(2);
			expect(config.files).to.have.members(['./test/**/*/+(*subset*.test.*|*.test.*subset*)', './test/**/*/+(*subset2*.test.*|*.test.*subset2*)']);
		});

		it('should add --grep value to testFramework config', () => {
			const wtrConfig = new WTRConfig({ grep: 'subset|subset2' });
			const config = wtrConfig.create();
			expect(config.testFramework.config).to.have.property('grep', 'subset|subset2');
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
			const wtrConfig = new WTRConfig({ firefox: true, webkit: true });
			const browsers = wtrConfig.getBrowsers(['chromium']);
			expect(browsers).to.have.length(2);
			expect(browsers.map(b => b.name)).to.have.members(['Webkit', 'Firefox']);
		});

	});
});
