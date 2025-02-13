import { readFile, writeFile } from 'node:fs/promises';
import { env } from 'node:process';
import { join } from 'node:path';
import revisions from '../src/browser-revisions.js';

const BROWSERS = ['chromium', 'firefox', 'webkit'];
const { browsers } = JSON.parse(await readFile(join(env.INIT_CWD, 'node_modules/playwright-core/browsers.json'), { encoding: 'utf8' }));

const newRevisions = browsers.reduce((acc, { name, revision, browserVersion: version }) => {
	const noRevision = !acc.find(i => i.name === name && i.revision === revision);
	if (noRevision && BROWSERS.includes(name)) {
		acc = acc.filter(r => r.name !== name || r.version !== version || r.revision > revision);
		if (!acc.find(i => i.name === name && i.version === version && i.revision > revision)) {
			acc.push({ name, revision, version });
		}
	}
	return acc;
}, revisions);

await writeFile('./src/browser-revisions.js', `export default ${JSON.stringify(newRevisions, null, '\t')};\n`);
