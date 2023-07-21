import { globSync } from 'glob';

export function headedMode({ watch, pattern }) {

	const files = globSync(pattern, { ignore: 'node_modules/**', posix: true });

	return {
		name: 'brightspace-headed-mode',
		async transform(context) {
			if (watch && files.includes(context.path.slice(1))) {
				return `debugger;\n${context.body}`;
			}
		}
	};
}
