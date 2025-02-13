#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import process from 'node:process';
import { exec } from 'node:child_process';
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
	} else {
		stdout.write(`\nfatal: unknown subcommand: ${vdiff.subcommand}\n`);
	}
} else if (cli.subcommand === 'install-browsers') {
	const version = cli._unknown[0];
	exec(`npm i playwright-core@${version} --no-save && npx playwright install --with-deps && npm i playwright-core`, { stdio: "inherit" }, (err, stdo, stde) => {
		if (err) {
			stdout.write(err.message.replace(/Command failed:.*/, ''));
		} else {
			stdout.write(`\n${stdo}\n`);
		}
	});
} else {
	runTests();
}

async function runTests() {
	runner.install();
	const options = await runner.getOptions(argv);
	await runner.start(options);
}
