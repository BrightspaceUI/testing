#!/usr/bin/env node
import { ConfigLoaderError, readConfig } from '@web/config-loader';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import process from 'node:process';
import { startTestRunner } from '@web/test-runner';
import { WTRConfig } from '../src/server/wtr-config.js';

const DISALLOWED_OPTIONS = ['--browsers', '--playwright', '--puppeteer', '--groups'];

const optionDefinitions = [
	// @web/test-runner options
	{
		name: 'files',
		type: String,
		multiple: true,
		description: 'Test files to run. Path or glob.\n[Default: ./test/**/*.<group>.js]',
		order: 8
	},
	{
		name: 'group',
		type: String,
		required: true,
		defaultOption: true,
		description: 'Name of the group to run tests for\n[Default: test]',
		order: 1
	},
	{
		name: 'manual',
		type: Boolean,
		description: 'Starts test runner in manual testing mode. Ignores browser options and prints manual testing URL.\n{underline Not compatible with automated browser interactions}\nConsider using --watch to debug in the browser instead',
		order: 11
	},
	{
		name: 'watch',
		type: Boolean,
		description: 'Reload tests on file changes. Allows debugging in all browsers.',
		order: 9
	},

	// d2l-test options
	{
		name: 'chrome',
		type: Boolean,
		description: 'Run tests in Chromium',
		order: 2
	},
	{
		name: 'config',
		alias: 'c',
		type: String,
		description: 'Location to read config file from\n[Default: ./d2l-test.config.js]',
		order: 9
	},
	{
		name: 'filter',
		alias: 'f',
		type: String,
		multiple: true,
		description: 'Filter test files by replacing wildcards with this glob',
		order: 6
	},
	{
		name: 'firefox',
		type: Boolean,
		description: 'Run tests in Firefox',
		order: 3
	},
	{
		name: 'golden',
		type: Boolean,
		description: 'Generate new golden screenshots',
		order: 10
	},
	{
		name: 'grep',
		alias: 'g',
		type: String,
		description: 'Only run tests matching this string or regexp',
		order: 7
	},
	{
		name: 'help',
		type: Boolean,
		description: 'Print usage information and exit',
		order: 12
	},
	{
		name: 'safari',
		type: Boolean,
		description: 'Run tests in Webkit',
		order: 4
	},
	{
		name: 'timeout',
		alias: 't',
		type: Number,
		description: 'Test timeout threshold in ms\n[Default: 2000]',
		order: 5
	},
];

const cliArgs = commandLineArgs(optionDefinitions, { partial: true });

if (cliArgs.help) {
	const help = commandLineUsage([
		{
			header: 'D2L Test',
			content: 'Test runner for D2L components and applications'
		},
		{
			header: 'Usage',
			content: 'd2l-test [options]',
		},
		{
			header: 'Options',
			optionList: optionDefinitions
				.map(o => (o.description += '\n') && o)
				.sort((a, b) => (a.order > b.order ? 1 : -1))
		}
	]);
	process.stdout.write(help);
	process.exit();
}

cliArgs._unknown = cliArgs._unknown?.filter(o => !DISALLOWED_OPTIONS.includes(o));

const testConfig = await readConfig('d2l-test.config', cliArgs.config).catch(err => {
	if (err instanceof ConfigLoaderError) {
		throw new Error(err.message);
	} else {
		throw err;
	}
}) || {};

const wtrConfig = new WTRConfig(cliArgs);
const config = wtrConfig.create(testConfig);

const argv = [
	'--group', cliArgs.group,
	...(cliArgs._unknown || [])
];
// copy cli-only wtr options back to argv to be processed
cliArgs.watch && argv.push('--watch');
cliArgs.manual && argv.push('--manual');

await startTestRunner({
	argv,
	config,
	readFileConfig: false
});
