#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import { execSync } from 'node:child_process';
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
	} else if (vdiff.subcommand === 'migrate-local') {

		const { pattern = './**' } = commandLineArgs({ name: 'pattern', type: String, defaultOption: true }, { partial: true, argv: vdiff._unknown || [] });

		stdout.write('\nInstalling @brightspace-ui/visual-diff\n');
		execSync('npm install @brightspace-ui/visual-diff@14  --no-save');
		stdout.write(`\nRunning existing tests for pattern '${pattern}/*.visual-diff.js'\n`);
		execSync(`npx mocha '${pattern}/*.visual-diff.js' -t 10000 --golden`);
		stdout.write('\nTest run complete.\n');

		const { migrate } = await import('../src/server/cli/vdiff/migrate.js');
		await migrate.start(vdiff._unknown, true);
	} else {
		stdout.write(`\nfatal: unknown subcommand: ${vdiff.subcommand}\n`);
	}
} else {
	runTests();
}

async function runTests() {
	runner.install();
	const options = await runner.getOptions(argv);
	await runner.start(options);
}
