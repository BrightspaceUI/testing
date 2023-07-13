import { globSync } from 'glob';

export function headedMode({ open, watch, pattern }) {

	const files = globSync(pattern, { ignore: 'node_modules/**', posix: true });

	const delay = ms => ms && new Promise(r => setTimeout(r, ms));

	return {
		name: 'brightspace-headed-mode',
		async transform(context) {
			if ((watch || open) && files.includes(context.path.slice(1))) {
				await delay(0);
				return `debugger;\nimport '@brightspace-ui/testing/pause.js';\n${context.body}`;
			}
		}
	};
}
