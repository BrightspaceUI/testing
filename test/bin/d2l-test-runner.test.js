import { assert, restore, stub } from 'sinon';
import { argv } from 'node:process';
import { runner } from '../../src/server/cli/test-runner.js';

describe('d2l-test-runner', () => {

	it('starts test runner with options', async() => {
		const opts = { my: 'options' };
		const optionsStub = stub(runner, 'getOptions').returns(opts);
		const startStub = stub(runner, 'start');
		await import('../../bin/d2l-test-runner.js');

		assert.calledOnceWithExactly(optionsStub, argv);
		assert.calledOnceWithExactly(startStub, opts);

		restore();
	});
});
