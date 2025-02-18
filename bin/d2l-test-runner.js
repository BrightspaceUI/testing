#!/usr/bin/env node --no-warnings
import commandLineArgs from 'command-line-args';
import { exec } from 'node:child_process';
import process from 'node:process';
import { runner } from '../src/server/cli/test-runner.js';

const { argv, env, exit, stderr, stdout } = process;
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
	// Install the temporary package
	const pw = exec(`npm i pw-temp@npm:playwright-core@${version} --no-save`, { stdio: 'pipe' }, err => err && stderr.write(err.message.replace(/Command failed:.*/, '')));
	pw.on('close', code => {
		if (code) exit(code);
		// Install the browsers
		const i = exec(`npx playwright-core@${version} install  --with-deps chromium firefox webkit`, { stdio: 'pipe', env: { ...env, PLAYWRIGHT_SKIP_BROWSER_GC: 1 } }, err => err && stderr.write(err.message.replace(/Command failed:.*/, '')));
		i.stdout.on('data', data => {
			stdout.write(data);
		});
		i.on('close', () => {
			// Uninstall the temporary package and reset .bin links
			exec('npm uninstall pw-temp && npm unlink playwright-core', { stdio: 'ignore' });
		});
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
