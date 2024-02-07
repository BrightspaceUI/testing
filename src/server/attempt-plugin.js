export function attemptPlugin({ files }) {

	return {
		name: 'brightspace-attempt',
		async transform(context) {
			const file = context.path.slice(1);
			if (file.endsWith('setup.js')) {
				if (files) {
					return `window._attemptFiles = ${JSON.stringify(files)};\n${context.body}`;
				}
			}
		}
	};
}
