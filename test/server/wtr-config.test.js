import { expect } from 'chai';
import { WTRConfig } from '../../src/server/wtr-config.js';

describe('WTRConfig', () => {

	describe('create()', () => {

		let config, wtrConfig;
		before(() => {
			wtrConfig = new WTRConfig();
			config = wtrConfig.create();
		});

		it('should remove browsers passthrough config', () => {
			const config = wtrConfig.create({ browsers: [ 1, 2, 3 ] });
			expect(config).to.be.an('object');
			expect(config.browsers).to.be.undefined;
		});

		it('should convert passthrough group browsers to playwright', () => {
			const wtrConfig = new WTRConfig({ group: 'a-group' });
			const config = wtrConfig.create({ groups: [{ name: 'a-group', browsers: ['chromium', 'chrome', 'firefox', 'gecko', 'safari', 'webkit'] }] });
			const group = config.groups[0];
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(group.name).to.equal('a-group');
			expect(group.browsers).to.be.an('array').that.has.length(3);
			expect(group.browsers.filter(b => b.name === 'Chromium')).to.have.length(1);
			group.browsers.forEach(b => expect(b.constructor.name).to.equal('PlaywrightLauncher'));
		});

		it('should create a valid group when requested from CLI', () => {
			const wtrConfig = new WTRConfig({ group: 'implicit-group' });
			const config = wtrConfig.create();
			const group = config.groups[0];
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(group.name).to.equal('implicit-group');
			expect(group.files).to.include.members(['./test/**/*.implicit-group.js']);
			expect(group.browsers).to.be.an('array').that.has.length(3);
		});

		it('should add missing files to group config', () => {
			const wtrConfig = new WTRConfig({ group: 'a-group' });
			const config = wtrConfig.create({ groups: [{ name: 'a-group' }] });
			const group = config.groups[0];
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(group.name).to.equal('a-group');
			expect(group.files).to.include.members(['./test/**/*.a-group.js']);
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
			['open', 'watch'].forEach(mode => {
				const wtrConfig = new WTRConfig({ timeout: 4000, [mode]: true });
				const config = wtrConfig.create({ timeout: 3000 });
				expect(config.plugins).to.have.length(1);
				expect(config.testFramework.config.timeout).to.equal('0');
			});
		});

		it('should throw for invalid timeout value', () => {
			expect(() => wtrConfig.create({ timeout: 'never' }))
				.to.throw(TypeError, 'timeout must be a number');
		});

		it('should configure testFramework when provided with a slow value', () => {
			const config = wtrConfig.create({ slow: 1234 });
			expect(config.testFramework).to.not.be.undefined;
			expect(config.testFramework.config).to.not.be.undefined;
			expect(config.testFramework.config.slow).to.equal('1234');
		});

		it('should set slow from CLI when provided', () => {
			const wtrConfig = new WTRConfig({ slow: 1234 });
			const config = wtrConfig.create({ slow: 5678 });
			expect(config.testFramework.config.slow).to.equal('1234');
		});

		it('should default slow to a higher value for vdiff group', () => {
			const wtrConfig = new WTRConfig({ group: 'vdiff' });
			const config = wtrConfig.create();
			expect(config.testFramework.config.slow).to.equal('500');
		});

		it('should set slow from CLI even for vdiff group', () => {
			const wtrConfig = new WTRConfig({ group: 'vdiff', slow: 1234 });
			const config = wtrConfig.create();
			expect(config.testFramework.config.slow).to.equal('1234');
		});

		it('should set slow from config even for vdiff group', () => {
			const wtrConfig = new WTRConfig({ group: 'vdiff' });
			const config = wtrConfig.create({ slow: 5678 });
			expect(config.testFramework.config.slow).to.equal('5678');
		});

		it('should throw for invalid slow value', () => {
			expect(() => wtrConfig.create({ slow: 'fast' }))
				.to.throw(TypeError, 'slow must be a number');
		});

		it('should set a common default files pattern', () => {
			expect(config.groups[0].files).to.deep.equal([ './test/**/*.test.js', '!**/node_modules/**/*' ]);
		});

		it('should run a given pattern function to set files', () => {
			const config = wtrConfig.create({ pattern: type => `./a/b.${type}.js` });
			expect(config.groups[0].files).to.include.members(['./a/b.test.js']);
		});

		it('should create a "test" group by default', () => {
			expect(config.groups).to.be.an('array');
			expect(config.groups.map(g => g.name)).to.have.members(['test']);
		});

		it('should not configure vdiff by default', () => {
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(config.plugins).to.be.undefined;
			expect(config.groups.find(g => g.name === 'vdiff')).to.be.undefined;
		});

		it('should configure vdiff when group is "vdiff"', () => {
			const wtrConfig = new WTRConfig({ group: 'vdiff' });
			const config = wtrConfig.create();
			expect(config.groups).to.be.an('array').that.has.length(1);
			expect(config.plugins).to.be.an('array').that.has.length(1);
			expect(config.groups[0]).to.have.property('name', 'vdiff');
		});

		it('should filter test files using --filter values', () => {
			const wtrConfig = new WTRConfig({ filter: ['subset', 'subset*'] });
			const config = wtrConfig.create({ pattern: type => `./test/**/*/*.${type}.*` });
			expect(config.files).to.be.undefined;
			expect(config.groups[0].files).to.have.length(3);
			expect(config.groups[0].files).to.have.members(['./test/**/*/+(subset.test.*|*.test.subset)', './test/**/*/+(subset*.test.*|*.test.subset*)', '!**/node_modules/**/*']);
		});

		it('should never filter excluded files', () => {
			const wtrConfig = new WTRConfig({ filter: ['subset'], files: ['./used/*', '!no-no/*'] });
			const config = wtrConfig.create({ pattern: () => './not-used/*' });
			expect(config.groups[0].files).to.have.length(3);
			expect(config.groups[0].files).to.have.members(['./used/+(subset)', '!no-no/*', '!**/node_modules/**/*']);
		});

		it('should add --grep value to testFramework config', () => {
			const wtrConfig = new WTRConfig({ grep: 'subset|subset2' });
			const config = wtrConfig.create();
			expect(config.testFramework.config).to.have.property('grep', 'subset|subset2');
		});

	});

	describe('getBrowsers()', () => {

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
			const browsers = wtrConfig.getBrowsers(['safari']);
			expect(browsers).to.have.length(1);
			expect(browsers[0].name).to.equal('Webkit');
		});

		it('should only use CLI browsers when provided', () => {
			const wtrConfig = new WTRConfig({ firefox: true, safari: true });
			const browsers = wtrConfig.getBrowsers(['chrome']);
			expect(browsers).to.have.length(2);
			expect(browsers.map(b => b.name)).to.have.members(['Webkit', 'Firefox']);
		});

	});
});
