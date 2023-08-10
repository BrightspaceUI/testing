import { ConfigLoaderError, readConfig } from '@web/config-loader';
import { DEFAULT_VDIFF_SLOW, WTRConfig } from '../wtr-config.js';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import { execSync } from 'node:child_process';
import process from 'node:process';
import { startTestRunner } from '@web/test-runner';

async function getTestRunnerOptions(argv = []) {

	const DISALLOWED_OPTIONS = ['--browsers', '--playwright', '--puppeteer', '--groups', '--manual'];

	const optionDefinitions = [
		// web-test-runner options
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
			name: 'watch',
			type: Boolean,
			description: 'Reload tests on file changes. Allows debugging in all browsers.',
			order: 10
		},

		// d2l-test-runner options
		{
			name: 'chromium',
			type: Boolean,
			description: 'Run tests in Chromium',
			order: 2
		},
		{
			name: 'chrome',
			longAlias: 'chromium',
			type: Boolean
		},
		{
			name: 'config',
			alias: 'c',
			type: String,
			description: 'Location to read config file from\n[Default: ./d2l-test-runner.config.js]',
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
			type: Boolean
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
			order: 14
		},
		{
			name: 'open',
			type: Boolean,
			description: 'Open the browser in headed mode',
			order: 11
		},
		{
			name: 'safari',
			longAlias: 'webkit',
			type: Boolean
		},
		{
			name: 'slow',
			alias: 's',
			type: Number,
			description: `Tests whose duration in milliseconds are at most half of this threshold are "fast" and tests which exceed it are "slow"\n[Default: 75 (normal), ${DEFAULT_VDIFF_SLOW} (vdiff)]`,
			order: 13
		},
		{
			name: 'slowmo',
			type: Number,
			description: 'Slows down test operations by the specified number of milliseconds. Useful so that you can see what is going on.',
			order: 12
		},
		{
			name: 'timeout',
			alias: 't',
			type: Number,
			description: 'Test timeout threshold in ms\n[Default: 2000]',
			order: 5
		},
		{
			name: 'webkit',
			type: Boolean,
			description: 'Run tests in Webkit',
			order: 4
		},
	];

	const cliArgs = commandLineArgs(optionDefinitions, { partial: true, argv });

	if (cliArgs.help) {
		const help = commandLineUsage([
			{
				header: 'D2L Test',
				content: 'Test runner for D2L components and applications'
			},
			{
				header: 'Usage',
				content: 'd2l-test-runner [options]\nd2l-test-runner <command> [options]\n',
			},
			{
				header: 'Options',
				optionList: optionDefinitions
					.map(o => {
						const longAlias = optionDefinitions.find(clone => clone !== o && clone.longAlias === o.name)?.name;
						if (longAlias) o.name += `, --${longAlias}`;
						return o;
					})
					.filter(o => 'order' in o)
					.sort((a, b) => (a.order > b.order ? 1 : -1))
			},
			{
				header: 'Commands',
				content: [{
					example: 'vdiff',
					desc: 'Run tests for the vdiff group'
				},
				{
					example: 'vdiff report',
					desc: 'Open the latest vdiff report'
				},
				{
					example: 'vdiff golden',
					desc: 'Generate new golden screenshots'
				},
				{
					example: 'vdiff migrate [directory]',
					desc: 'Migrate from @brightspace-ui/visual-diff. Restrict which goldens are migrated with a directory glob.'
				}]
			}
		]);
		process.stdout.write(help);
		process.exit();
	}

	cliArgs._unknown = cliArgs._unknown?.filter(o => !DISALLOWED_OPTIONS.includes(o));

	const testConfig = await readConfig('d2l-test-runner.config', cliArgs.config).catch(err => {
		if (err instanceof ConfigLoaderError) {
			throw new Error(err.message);
		} else {
			throw err;
		}
	}) || {};

	const wtrConfig = new WTRConfig(cliArgs);
	const config = wtrConfig.create(testConfig);

	argv = [
		'--group', cliArgs.group,
		...(cliArgs._unknown || [])
	];
	// copy cli-only wtr options back to argv to be processed
	cliArgs.watch && argv.push('--watch');

	return {
		argv,
		config,
		readFileConfig: false
	};
}

function installDeps() {
	execSync('npx playwright install-deps', { stdio: 'pipe' });
}

export const runner = {
	getOptions: getTestRunnerOptions,
	install: installDeps,
	start: startTestRunner
};
