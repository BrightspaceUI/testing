import { css, html } from 'lit';
import { ICON_EMPTY, ICON_FULL, ICON_SPLIT } from './icons.js';
import { classMap } from 'lit/directives/class-map.js';

export const COMMON_STYLE = css`
	.empty {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.empty > svg {
		color: #007bff;
		height: 100px;
		width: 100px;
	}
	.empty > p {
		color: #6e7477;
		font-size: 1.1rem;
		font-weight: bold;
		margin: 0;
	}
	.pass {
		color: #46a661;
	}
	.error {
		color: #cd2026;
	}
	.warning {
		color: #e87511;
	}
	.padding {
		padding: 20px;
	}
`;

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

export const STATUS_TYPE = {
	ERROR: 'error',
	NORMAL: 'normal',
	WARNING: 'warning'
};

let id = 0;
export function getId() {
	id++;
	return `id-${id}`;
}

export function renderEmpty() {
	return html`
		<div class="empty padding">
			${ICON_EMPTY}
			<p>No tests exist for the selected filters.</p>
		</div>
	`;
}

export function renderStatusText(text, status) {
	const statusClass = {
		pass: status === STATUS_TYPE.NORMAL,
		error: status === STATUS_TYPE.ERROR,
		warning: status === STATUS_TYPE.WARNING
	};
	return html`<span class="${classMap(statusClass)}">${text}</span>`;
}

export function renderTestStatus(numPassed, numTotal) {
	const status = numPassed === numTotal ? STATUS_TYPE.NORMAL : STATUS_TYPE.ERROR;
	return renderStatusText(`(${numPassed}/${numTotal} passed)`, status);
}
