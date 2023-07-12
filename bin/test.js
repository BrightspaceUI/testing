#!/usr/bin/env node
import { ConfigLoaderError, readConfig } from '@web/config-loader';
import commandLineArgs from 'command-line-args';
import { startTestRunner } from '@web/test-runner';
import { WTRConfig } from '../src/server/wtr-config.js';

const DISALLOWED_OPTIONS = ['--browsers', '--playwright', '--puppeteer', '--groups'];

const optionDefinitions = [
	// @web/test-runner options
	{ name: 'files', type: String, multiple: true },
	{ name: 'group', type: String, defaultOption: true },
	{ name: 'manual', type: Boolean },
	{ name: 'watch', type: Boolean },
	// custom options
	{ name: 'chrome', type: Boolean },
	{ name: 'config', alias: 'c', type: String }, // disabled for wtr
	{ name: 'filter', alias: 'f', type: String, multiple: true },
	{ name: 'firefox', type: Boolean },
	{ name: 'golden', type: Boolean },
	{ name: 'grep', alias: 'g', type: String },
	{ name: 'safari', type: Boolean },
	{ name: 'timeout', alias: 't', type: Number },
];

const cliArgs = commandLineArgs(optionDefinitions, { partial: true });

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
