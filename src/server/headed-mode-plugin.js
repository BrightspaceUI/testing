import { globSync } from 'glob';

export function headedMode({ manual, watch, pattern }) {

	const files = globSync(pattern, { ignore: 'node_modules/**' });

	return {
		name: 'brightspace-manual-pause',
		async transform(context) {
			if ((watch || manual) && files.includes(context.path.slice(1))) {
				watch && await new Promise(r => setTimeout(r, 2000));
				return `debugger;\n${context.body}`;
			}
		}
	};
}
