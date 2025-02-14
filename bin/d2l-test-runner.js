#!/usr/bin/env node --no-warnings
import commandLineArgs from 'command-line-args';
import { exec } from 'node:child_process';
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
	} else {
		stdout.write(`\nfatal: unknown subcommand: ${vdiff.subcommand}\n`);
	}
} else if (cli.subcommand === 'install-browsers') {
	const version = cli._unknown[0];
	// 1. Install the temporary package
	// 2. Install the browsers
	// 3. Uninstall the temporary package
	// 4. Reset .bin links
	exec(`npm i pw-temp@npm:playwright-core@${version} --no-save && npx playwright-core install --with-deps && npm uninstall pw-temp && npm unlink playwright-core`, { stdio: 'inherit' }, (err, stdo) => {
		if (err) {
			stdout.write(err.message.replace(/Command failed:.*/, ''));
		} else {
			stdout.write(stdo);
		}
	});
} else if (cli.subcommand === 'version') {
	const { version } = (await import('../package.json', { with: { type: 'json' } })).default;
	stdout.write(`v${version}\n`);
} else {
	runTests();
}

async function runTests() {
	runner.install();
	const options = await runner.getOptions(argv);
	await runner.start(options);
}
