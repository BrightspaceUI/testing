import { readFile, writeFile } from 'node:fs/promises';
import { env } from 'node:process';
import { join } from 'node:path';
import revisions from '../src/browser-revisions.js';

const BROWSERS = [ 'chromium', 'firefox', 'webkit' ];

const { browsers } = JSON.parse(await readFile(join(env.INIT_CWD, 'node_modules/playwright-core/browsers.json'), { encoding: 'utf8' }));

const newRevisions = browsers.reduce((acc, { name, revision, browserVersion: version }) => {
	if (BROWSERS.includes(name)) {
		const found = acc[name]?.find(([r]) => r === revision);
		if (!found) {
			acc[name] = acc[name].filter(([r, v]) => v !== version || r > revision);
			if (!acc[name].find(([r, v]) => v === version && r > revision)) {
				acc[name].push([ revision, version ]);
			}
		}
	}
	return acc;
}, revisions);

Object.entries(newRevisions).forEach(([k, v]) => {
	newRevisions[k] = v.sort(([a], [b]) => a - b);
})

await writeFile('./src/browser-revisions.js', `export default ${
	JSON.stringify(newRevisions, null, '\t')
		.replace(/\[\s+"/g, '[ "')
		.replace(/"\s+\]/g, '" ]')
		.replace(/",\s+"/g, '", "')
};\n`);
