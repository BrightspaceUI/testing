import { ICON_FULL, ICON_SPLIT } from './icons.js';

export const FILTER_STATUS = {
	ALL: 'All',
	PASSED: 'Passed',
	FAILED: 'Failed'
};

export const FULL_MODE = {
	GOLDEN: {
		label: 'Golden',
		value: 'golden'
	},
	NEW: {
		label: 'New',
		value: 'new'
	}
};

export const LAYOUTS = {
	FULL: {
		label: 'Full',
		icon: ICON_FULL,
		value: 'full'
	},
	SPLIT: {
		label: 'Split',
		icon: ICON_SPLIT,
		value: 'split'
	}
};

let id = 0;
export function getId() {
	id++;
	return `id-${id}`;
}
