import { globSync } from 'glob';

export function headedMode({ manual, watch, pattern }) {

	const files = globSync(pattern, { ignore: 'node_modules/**', posix: true });

	return {
		name: 'brightspace-headed-mode',
		async transform(context) {
			if ((watch || manual) && files.includes(context.path.slice(1))) {
				// allow time to open devtools in firefox and webkit
				watch && await new Promise(r => setTimeout(r, 2000));
				return `debugger;\n${context.body}`;
			}
		}
	};
}
