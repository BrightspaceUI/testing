import { dirname, posix } from 'node:path';
import { globSync } from 'glob';

export function headedMode({ open, watch, pattern }) {

	const files = globSync(pattern, { ignore: 'node_modules/**', posix: true });

	return {
		name: 'brightspace-headed-mode',
		async transform(context) {
			if ((watch || open) && files.includes(context.path.slice(1))) {
				const pausePath = posix.join(dirname(import.meta.url), 'pause.js').replace(/file:(\/c:)?/i, '');
				return `debugger;\nimport '${pausePath}'\n${context.body}`;
			}
		}
	};
}
