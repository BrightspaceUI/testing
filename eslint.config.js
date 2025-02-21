import { browserConfig, nodeConfig, setDirectoryConfigs, testingConfig } from 'eslint-config-brightspace';
import globals from 'globals';

export default [
	{
		ignores: ['.vdiff', 'src/browser-revisions.js']
	},
	...setDirectoryConfigs(
		browserConfig,
		{
			test: [
				...nodeConfig,
				{
					languageOptions: {
						globals: { ...globals.mocha }
					}
				}
			],
			'test/browser': testingConfig
		}
	)
];
