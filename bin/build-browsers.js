import { readFile, writeFile } from 'node:fs/promises';
import revisions from '../src/browser-revisions.js';

const BROWSERS = ['chromium', 'firefox', 'webkit'];
const { browsers } = JSON.parse(await readFile('./node_modules/playwright-core/browsers.json', { encoding: 'utf8' }));

const newRevisions = browsers.reduce((acc, { name, revision, browserVersion }) => {
	return (
		!acc.find(i => i.name === name && i.revision === revision)
		&& BROWSERS.includes(name)
		&& acc.push({ name, revision, version: browserVersion.split('.')[0] })
		&& acc
	) || acc;
}, revisions);

await writeFile('./src/browser-revisions.js', `export default ${JSON.stringify(newRevisions, null, '\t')}`);
