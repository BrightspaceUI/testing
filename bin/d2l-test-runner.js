#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import process from 'node:process';
import { runner } from '../src/server/cli/test-runner.js';

const { argv, stdout } = process;
const cli = commandLineArgs({ name: 'subcommand', defaultOption: true }, { stopAtFirstUnknown: true, argv });

if (cli.subcommand === 'vdiff') {
	const vdiff = commandLineArgs({ name: 'subcommand', defaultOption: true }, { stopAtFirstUnknown: true, argv: cli._unknown || [] });

	if (!vdiff.subcommand) {
		runTests();
	} else if (vdiff.subcommand === 'golden') {
		argv.splice(argv.findIndex(a => a === 'golden'), 1, '--golden');
		stdout.write('\nGenerating vdiff goldens...\n');
		runTests();
	} else if (vdiff.subcommand === 'report') {
		const { report } = await import('../src/server/cli/vdiff/report.js');
		await report.start();
	} else if (vdiff.subcommand === 'migrate') {
		const { migrate } = await import('../src/server/cli/vdiff/migrate.js');
		await migrate.start(vdiff._unknown);
	} else {
		stdout.write(`\nfatal: unknown subcomamnd: ${vdiff.subcommand}\n`);
	}
} else {
	runTests();
}

async function runTests() {
	await runner.install();
	const options = await runner.getOptions(argv);
	await runner.start(options);
}
