import { assert, restore, stub } from 'sinon';
import { bail } from '../../src/server/bail.js';
import { expect } from 'chai';
import { migrate } from '../../src/server/cli/vdiff/migrate.js';
import process from 'node:process';
import { runner } from '../../src/server/cli/test-runner.js';

const { argv, stdout } = process;

const run = async() => {
	await import(`../../bin/d2l-test-runner.js?${Math.random()}`);
};

describe('d2l-test-runner', () => {

	beforeEach(() => {
		bail.clear();
	});

	it('starts test runner with options', async() => {
		const opts = { my: 'options' };
		const optionsStub = stub(runner, 'getOptions').returns(opts);
		const startStub = stub(runner, 'start');
		await run();

		assert.calledOnceWithExactly(optionsStub, argv);
		assert.calledOnceWithExactly(startStub, opts);

		restore();
	});

	it('runs report.js', async() => {
		const optionsStub = stub(runner, 'getOptions');
		const startStub = stub(runner, 'start');

		bail.add('report');
		argv.splice(0, argv.length, 'fake-node', 'fake-test-runner', 'vdiff', 'report');
		await run();

		expect(bail).to.not.include('report');

		assert.notCalled(optionsStub);
		assert.notCalled(startStub);

		restore();
	});

	it('generates goldens', async() => {
		const optionsStub = stub(runner, 'getOptions');
		const startStub = stub(runner, 'start');
		const stdoutStub = stub(stdout, 'write');

		argv.splice(0, argv.length, 'fake-node', 'fake-test-runner', 'vdiff', 'golden');
		await run();

		expect(argv).to.deep.equal(['fake-node', 'fake-test-runner', 'vdiff', '--golden']);
		assert.calledOnceWithExactly(optionsStub, argv);
		assert.calledOnce(startStub);
		assert.calledOnceWithExactly(stdoutStub, '\nGenerating vdiff goldens...\n');

		restore();
	});

	it('calls migrate()', async() => {
		const migrateStub = stub(migrate, 'start');
		const optionsStub = stub(runner, 'getOptions');
		const startStub = stub(runner, 'start');

		argv.splice(0, argv.length, 'fake-node', 'fake-test-runner', 'vdiff', 'migrate', './test/**/dir');
		await run();

		assert.calledOnceWithExactly(migrateStub, ['./test/**/dir']);
		assert.notCalled(optionsStub);
		assert.notCalled(startStub);

		restore();
	});

});
