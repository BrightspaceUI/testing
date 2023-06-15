export function manualPause({ manual, watch }) {
	return {
		name: 'brightspace-manual-pause',
		async transform(context) {
			if ((watch || manual) && context.path.endsWith('.vdiff.js')) {
				watch && await new Promise(r => setTimeout(r, 2000));
				return `debugger;\n${context.body}`;
			}
		}
	};
}
