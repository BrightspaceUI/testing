import { assert, restore, stub } from 'sinon';
import { expect } from 'chai';
import process from 'node:process';
import { report } from '../../src/server/cli/vdiff/report.js';
import { runner } from '../../src/server/cli/test-runner.js';

const { argv, stdout } = process;

const run = async() => {
	await import(`../../bin/d2l-test-runner.js?${Math.random()}`);
};

describe('d2l-test-runner', () => {

	afterEach(() => {
		restore();
	});

	it('starts test runner with options', async() => {
		const opts = { my: 'options' };
		const optionsStub = stub(runner, 'getOptions').returns(opts);
		const startStub = stub(runner, 'start');
		const installStub = stub(runner, 'install');
		await run();

		assert.calledOnceWithExactly(optionsStub, argv);
		assert.calledOnceWithExactly(startStub, opts);
		assert.calledOnce(installStub);

		restore();
	});

	it('starts report server', async() => {
		const reportStub = stub(report, 'start');
		const optionsStub = stub(runner, 'getOptions');
		const startStub = stub(runner, 'start');
		const installStub = stub(runner, 'install');

		argv.splice(0, argv.length, 'fake-node', 'fake-test-runner', 'vdiff', 'report');
		await run();

		assert.calledOnce(reportStub);
		assert.notCalled(optionsStub);
		assert.notCalled(startStub);
		assert.notCalled(installStub);
	});

	it('generates goldens', async() => {
		const optionsStub = stub(runner, 'getOptions');
		const startStub = stub(runner, 'start');
		const installStub = stub(runner, 'install');
		const stdoutStub = stub(stdout, 'write');

		argv.splice(0, argv.length, 'fake-node', 'fake-test-runner', 'vdiff', 'golden');
		await run();

		expect(argv).to.deep.equal(['fake-node', 'fake-test-runner', 'vdiff', '--golden']);
		assert.calledOnceWithExactly(optionsStub, argv);
		assert.calledOnce(startStub);
		assert.calledOnce(installStub);
		assert.calledOnceWithExactly(stdoutStub, '\nGenerating vdiff goldens...\n');
	});

});
