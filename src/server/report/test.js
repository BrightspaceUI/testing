import './test-result.js';
import { css, html, LitElement, nothing } from 'lit';
import { FULL_MODE, getId, LAYOUTS } from './common.js';
import data from './data.js';

class Test extends LitElement {
	static properties = {
		file: { type: String },
		fullMode: { attribute: 'full-mode', type: String },
		layout: { type: String },
		showOverlay: { attribute: 'show-overlay', type: Boolean },
		test: { type: String },
	};
	static styles = [css`
		.header {
			background-color: #f0f0f0;
			border-bottom: 1px solid #e6e6e6;
			box-shadow: 0 0 6px rgba(0,0,0,.07);
			position: sticky;
			top: 0;
			z-index: 2;
		}
		.title h2 {
			margin: 0;
		}
		.settings {
			align-items: center;
			display: flex;
			padding-top: 20px;
			gap: 20px;
		}
		.settings-box {
			background-color: #ffffff;
			border: 1px solid #cdd5dc;
			border-radius: 5px;
			line-height: 24px;
			padding: 10px;
			user-select: none;
		}
		.header, .results {
			padding: 20px;
		}
		.pill-box {
			border-radius: 5px;
			display: flex;
			flex-wrap: nowrap;
		}
		.pill input[type="radio"] {
			position: absolute;
			opacity: 0;
			pointer-events: none;
		}
		.pill label {
			align-items: center;
			background-color: #ffffff;
			border-block-end-style: solid;
			border-block-start-style: solid;
			border-inline-start-style: solid;
			border-color: #cdd5dc;
			border-width: 1px;
			cursor: pointer;
			display: flex;
			gap: 5px;
			line-height: 24px;
			padding: 10px;
			position: relative;
			user-select: none;
		}
		.pill:first-child label {
			border-start-start-radius: 5px;
			border-end-start-radius: 5px;
		}
		.pill:last-child label {
			border-end-end-radius: 5px;
			border-inline-end-style: solid;
			border-start-end-radius: 5px;
		}
		.pill input[type="radio"]:checked + label {
			background-color: #007bff;
			color: white;
		}
		.pill input[type="radio"]:focus-visible + label {
			z-index: 1;
			border-color: #007bff;
			box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #007bff;
		}
	`];
	render() {

		const { fileData, testData } = this._fetchData();
		if (!fileData || !testData) return nothing;

		let fullMode = nothing;
		if (this.layout === LAYOUTS.FULL.value) {
			fullMode = this._renderPillbox('fullMode', this.fullMode, [FULL_MODE.GOLDEN, FULL_MODE.NEW]);
		}

		return html`
			<div class="header">
				<div class="title">
					<h2>${testData.name}</h2>
					<div class="file-name">${fileData.name}</div>
				</div>
				<div class="settings">
					${this._renderPillbox('layout', this.layout, [LAYOUTS.FULL, LAYOUTS.SPLIT])}
					<label class="settings-box"><input type="checkbox" ?checked="${this.showOverlay}" @change="${this._handleOverlayChange}">Overlay Difference</label>
					${fullMode}
				</div>
			</div>
			<div class="results">
				${testData.results.map(r => html`<d2l-vdiff-report-test-result browser="${r.name}" full-mode="${this.fullMode}" layout="${this.layout}" file="${fileData.name}" ?show-overlay="${this.showOverlay}" test="${testData.name}"></d2l-vdiff-report-test-result>`)}
			</div>
		`;

	}
	_fetchData() {

		const fileData = data.files.find(f => f.name === this.file);
		if (!fileData) return {};

		const testData = fileData.tests.find(t => t.name === this.test);
		if (!testData) return {};

		return { fileData, testData };

	}
	_handleOverlayChange(e) {
		this._triggerChange('overlay', e.target.checked);
	}
	_handlePillboxChange(e) {
		this._triggerChange(e.target.name, e.target.value);
	}
	_renderPillbox(name, selectedValue, items) {
		const renderItem = (i) => {
			const id = getId();
			return html`
				<div class="pill">
					<input type="radio" id="${id}" name="${name}" value="${i.value}" @change="${this._handlePillboxChange}" ?checked="${i.value === selectedValue}">
					<label for="${id}">${i.icon}${i.label}</label>
				</div>
			`;
		};
		return html`<div class="pill-box">${items.map(i => renderItem(i))}</div>`;
	}
	_triggerChange(name, value) {
		this.dispatchEvent(new CustomEvent(
			'setting-change', {
				bubbles: false,
				composed: false,
				detail: {
					name: name,
					value: value
				}
			}
		));
	}
}

customElements.define('d2l-vdiff-report-test', Test);
