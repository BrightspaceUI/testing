import { assert, restore, stub } from 'sinon';
import { argv } from 'node:process';
import { runner } from '../../src/server/cli/test.js';

describe('d2l-test', () => {

	it('starts test runner with options', async() => {
		const opts = { my: 'options' };
		const optionsStub = stub(runner, 'getOptions').returns(opts);
		const startStub = stub(runner, 'start');
		await import('../../bin/test.js');

		assert.calledOnceWithExactly(optionsStub, argv);
		assert.calledOnceWithExactly(startStub, opts);

		restore();
	});
});
