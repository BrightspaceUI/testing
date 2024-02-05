import { css, html } from 'lit';
import { getId } from './common.js';

export const RADIO_STYLE = css`
	.radio-container {
		border-radius: 5px;
		display: flex;
		flex-wrap: nowrap;
	}
	.radio-item input[type="radio"] {
		opacity: 0;
		pointer-events: none;
		position: absolute;
	}
	.radio-item label {
		align-items: center;
		background-color: #ffffff;
		border-block-end-style: solid;
		border-block-start-style: solid;
		border-color: #cdd5dc;
		border-inline-start-style: solid;
		border-width: 1px;
		cursor: pointer;
		display: flex;
		gap: 5px;
		line-height: 24px;
		padding: 10px;
		position: relative;
		user-select: none;
	}
	.radio-item:first-child label {
		border-end-start-radius: 5px;
		border-start-start-radius: 5px;
	}
	.radio-item:last-child label {
		border-end-end-radius: 5px;
		border-inline-end-style: solid;
		border-start-end-radius: 5px;
	}
	.radio-item input[type="radio"]:checked + label {
		background-color: #007bff;
		color: white;
	}
	.radio-item input[type="radio"]:focus-visible + label {
		border-color: #007bff;
		box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #007bff;
		z-index: 1;
	}
`;

export function renderRadio(name, selectedValue, onChange, items) {
	const changeHandler = (e) => onChange(e.target.value);
	const renderItem = (i) => {
		const id = getId();
		return html`
			<div class="radio-item">
				<input type="radio" id="${id}" name="${name}" value="${i.value}" @change="${changeHandler}" ?checked="${i.value === selectedValue}">
				<label for="${id}">${i.icon}${i.label}</label>
			</div>
		`;
	};
	return html`<div class="radio-container">${items.map(i => renderItem(i))}</div>`;
}
