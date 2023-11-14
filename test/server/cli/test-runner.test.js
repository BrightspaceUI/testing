import { expect } from 'chai';
import { runner } from '../../../src/server/cli/test-runner.js';

describe('runner.getOptions()', () => {

	it('should create default options correctly', async() => {
		const opts = await runner.getOptions();
		expect(opts).to.deep.include({
			argv: ['--group', 'test'],
			readFileConfig: false,
		});
		expect(opts.config).to.deep.include({ nodeResolve: { exportConditions: ['default'] } });
		expect(opts.config).to.have.property('testRunnerHtml').that.is.a('function');
		expect(opts.config.groups).to.be.an('array').with.length(1);
		expect(opts.config.groups[0]).to.deep.include({
			name: 'test',
			files: [ './test/**/*.test.js', '!**/node_modules/**/*' ]
		});
	});

	it('should use --group for the default option', async() => {
		const opts = await runner.getOptions(['group-name']);
		expect(opts.argv).to.deep.equal(['--group', 'group-name']);
	});

	it('should not forward disallowed or stolen options', async() => {
		const disallowed = ['--browsers', '--playwright', '--puppeteer', '--groups', '--manual'];
		const stolen = ['--config', '--open'];
		const opts = await runner.getOptions([ ...disallowed, ...stolen, '--unknown-allowed']);
		expect(opts.argv).to.deep.equal(['--group', 'test', '--unknown-allowed']);
	});

	it('should forward borrowed options', async() => {
		const borrowed = ['--watch'];
		const opts = await runner.getOptions(borrowed);
		expect(opts.argv).to.deep.equal(['--group', 'test', '--watch']);
	});

	it('should convert aliases', async() => {
		const opts = await runner.getOptions([
			'-c', './test/browser/vdiff.config.js',
			'-f', 'abc',
			'-g', 'ghi',
			'-t', 123,
			'-s', 456]
		);
		expect(opts.argv).to.deep.equal(['--group', 'test']);
		expect(opts.config.groups[0]).to.deep.include({
			name: 'test',
			files: [ 'test/browser/**/+(abc.vdiff.js)', '!**/node_modules/**/*' ]
		});
		expect(opts.config.testFramework).to.deep.include({
			config: { timeout: '123', grep: 'ghi', slow: '456' }
		});
	});

});
