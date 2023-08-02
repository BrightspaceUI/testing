#!/usr/bin/env node
import { argv, stdout } from 'node:process';
import commandLineArgs from 'command-line-args';
import { runner } from '../src/server/cli/test-runner.js';

const cli = commandLineArgs({ name: 'subcommand', defaultOption: true }, { stopAtFirstUnknown: true });

if (cli.subcommand === 'vdiff') {
	const vdiff = commandLineArgs({ name: 'subcommand', defaultOption: true }, { stopAtFirstUnknown: true, argv: cli._unknown || [] });

	if (!vdiff.subcommand) {
		runTests();
	} else if (vdiff.subcommand === 'golden') {
		argv.splice(argv.findIndex(a => a === 'golden'), 1, '--golden');
		stdout.write('\nGenerating vdiff goldens...\n');
		runTests();
	} else if (vdiff.subcommand === 'report') {
		import('../src/server/cli/vdiff/report.js');
	}	else if (vdiff.subcommand === 'migrate') {
		const { migrate } = await import('../src/server/cli/vdiff/migrate.js');
		await migrate(vdiff._unknown);
	} else {
		stdout.write(`\nfatal: unknown subcomamnd: ${vdiff.subcommand}\n`);
	}
}
else {
	runTests();
}

async function runTests() {
	const options = await runner.getOptions(argv);
	await runner.start(options);
}
