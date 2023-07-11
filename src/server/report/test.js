import './button.js';
import './test-result.js';
import { css, html, LitElement, nothing } from 'lit';
import { FULL_MODE, getId, LAYOUTS } from './common.js';
import { ICON_BROWSERS, ICON_HOME } from './icons.js';
import { classMap } from 'lit/directives/class-map.js';
import data from './data.js';

class Test extends LitElement {
	static properties = {
		browsers: { type: String },
		file: { type: String },
		fullMode: { attribute: 'full-mode', type: String },
		layout: { type: String },
		showOverlay: { attribute: 'show-overlay', type: Boolean },
		test: { type: String },
		_selectedBrowserIndex: { state: true }
	};
	static styles = [css`
		:host {
			display: grid;
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				'header'
				'content'
				'footer';
			height: 100vh;
		}
		.header {
			border-bottom: 1px solid #cdd5dc;
			grid-area: header;
		}
		.tab-panels {
			grid-area: content;
			overflow: auto;
		}
		.footer {
			align-items: center;
			border-top: 1px solid #cdd5dc;
			display: flex;
			gap: 10px;
			grid-area: footer;
			padding: 20px;
		}
		.footer > svg {
			flex: 0 0 auto;
			height: 50px;
			width: 50px;
		}
		.footer-info {
			flex: 1 0 auto;
		}
		.footer-browser-name {
			font-size: 1.2rem;
			font-weight: bold;
		}
		.footer-timing {
			flex: 0 0 auto;
			font-size: 2rem;
			font-weight: bold;
		}
		.header, .footer {
			background-color: #f0f0f0;
			box-shadow: 0 0 6px rgba(0,0,0,.07);
		}
		.title {
			display: flex;
			padding: 20px 20px 0 20px;
		}
		.title h2 {
			margin: 0;
		}
		.title-info {
			flex: 1 0 auto;
		}
		.title-navigation {
			flex: 0 0 auto;
		}
		.settings {
			align-items: center;
			display: flex;
			padding: 20px;
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
		[role="tablist"] {
			align-items: stretch;
			border-top: 1px solid #cdd5dc;
			display: flex;
			flex: 0 0 auto;
			flex-wrap: nowrap;
		}
		[role="tab"] {
			background: none;
			border: none;
			border-right: 1px solid #cdd5dc;
			cursor: pointer;
			flex: 1 0 auto;
			margin: 0;
			outline: none;
			padding: 10px 15px;
			position: relative;
			user-select: none;
		}
		[role="tab"]:last-child {
			border-right: none;
		}
		[role="tab"] > span {
			display: inline-block;
			padding: 5px;
		}
		[role="tab"]:focus-visible > span {
			border: 2px solid #007bff;
			border-radius: 3px;
			padding: 3px;
		}
		[role="tab"]:hover > span {
			color: #007bff;
		}
		.tab-selected-indicator {
			border-block-start: 4px solid #007bff;
			border-start-start-radius: 4px;
			border-start-end-radius: 4px;
			bottom: 0;
			position: absolute;
			width: calc(100% - 30px);
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
	`];
	constructor() {
		super();
		this.browsers = [];
		this._selectedBrowserIndex = -1;
	}
	render() {

		const { browsers, fileData, testData } = this._fetchData();
		if (!fileData || !testData) return nothing;

		let fullMode = nothing;
		if (this.layout === LAYOUTS.FULL.value) {
			fullMode = this._renderPillbox('fullMode', this.fullMode, [FULL_MODE.GOLDEN, FULL_MODE.NEW]);
		}

		const selectedBrowser = this._getSelectedBrowser(browsers, testData);
		const selectedResult = testData.results.find(r => r.name === selectedBrowser.name);
		const tabButtons = browsers.length > 1 ? this._renderTabButtons(browsers, selectedBrowser, testData) : nothing;

		return html`
			<div class="header">
				<div class="title">
					<div class="title-info">
						<h2>${testData.name}</h2>
						<div>${fileData.name}</div>
					</div>
					<div class="title-navigation">
						<d2l-vdiff-report-button text="Back" @click="${this._handleBackClick}">${ICON_HOME}</d2l-vdiff-report-button>
					</div>
				</div>
				<div class="settings">
					${this._renderPillbox('layout', this.layout, [LAYOUTS.FULL, LAYOUTS.SPLIT])}
					<label class="settings-box"><input type="checkbox" ?checked="${this.showOverlay}" @change="${this._handleOverlayChange}">Overlay Difference</label>
					${fullMode}
				</div>
				${tabButtons}
			</div>
			${this._renderTabPanels(browsers, selectedBrowser, fileData, testData)}
			${this._renderFooter(selectedBrowser, selectedResult)}
		`;

	}
	_fetchData() {

		const fileData = data.files.find(f => f.name === this.file);
		if (!fileData) return {};

		const testData = fileData.tests.find(t => t.name === this.test);
		if (!testData) return {};

		const filteredBrowsers = this.browsers.split(',');
		const browsers = data.browsers.filter(b => filteredBrowsers.includes(b.name));

		return { browsers, fileData, testData };

	}
	_getSelectedBrowser(browsers, testData) {
		let selectedBrowserIndex = this._selectedBrowserIndex;
		if (selectedBrowserIndex > browsers.length - 1) {
			selectedBrowserIndex = -1;
		}
		if (selectedBrowserIndex < 0) {
			selectedBrowserIndex = browsers.findIndex(b => testData.results.find(r => r.name === b.name && !r.passed));
		}
		if (selectedBrowserIndex < 0) {
			selectedBrowserIndex = 0;
		}
		const selectedBrowser = browsers[selectedBrowserIndex];
		return selectedBrowser;
	}
	_handleBackClick() {
		this._triggerNavigation('home');
	}
	_handleOverlayChange(e) {
		this._triggerChange('overlay', e.target.checked);
	}
	_handlePillboxChange(e) {
		this._triggerChange(e.target.name, e.target.value);
	}
	_renderFooter(selectedBrowser, selectedResult) {
		const duration = selectedResult.duration;
		const durationClass = {
			'error': duration >= 1000,
			'footer-timing': true,
			'pass': duration < 500,
			'warning': duration >= 500 && duration < 1000
		};
		return html`
			<div class="footer">
				${ICON_BROWSERS[selectedBrowser.name]}
				<div class="footer-info">
					<div class="footer-browser-name">${selectedBrowser.name}</div>
					<div>version ${selectedBrowser.version}</div>
				</div>
				<div class="${classMap(durationClass)}">${selectedResult.duration}ms</div>
			</div>
		`;
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
	_renderTabButtons(browsers, selectedBrowser, testData) {

		const onKeyDown = (e) => {
			let focusOn;
			switch (e.key) {
				case 'ArrowRight':
					focusOn = e.target.nextElementSibling || e.target.parentNode.firstElementChild;
					break;
				case 'ArrowLeft':
					focusOn = e.target.previousElementSibling || e.target.parentNode.lastElementChild;
					break;
				case 'Home':
					focusOn = e.target.parentNode.firstElementChild;
					break;
				case 'End':
					focusOn = e.target.parentNode.lastElementChild;
					break;
			}
			if (focusOn) focusOn.focus();
		};

		const renderTabButton = (browser, index) => {
			const result = testData.results.find(r => r.name === browser);
			const selected = (browser === selectedBrowser.name);
			const status = result.passed ? 'passed' : 'failed';
			const onClick = () => {
				return () => this._selectedBrowserIndex = index;
			};
			const statusClass = {
				pass: result.passed,
				error: !result.passed
			};
			return html`
				<button
					aria-controls="tabpanel-${browser}"
					aria-selected="${selected ? 'true' : 'false'}"
					id="tab-${browser}"
					role="tab"
					tabindex="${selected ? '0' : '-1'}"
					type="button"
					@click="${onClick()}">
						<span>
							${browser} <span class="${classMap(statusClass)}">(${status})</span>
						</span>${selected ? html`
						<div class="tab-selected-indicator"></div>` : nothing}
				</button>`;
		};

		return html`
			<div role="tablist" aria-label="browser results" @keydown="${onKeyDown}">
				${browsers.map((b, i) => renderTabButton(b.name, i))}
			</div>
		`;
	}
	_renderTabPanels(browsers, selectedBrowser, fileData, testData) {

		const renderTabPanel = (browser) => {
			return html`
				<div id="tabpanel-${browser}" role="tabpanel" aria-labelledby="tab-${browser}" ?hidden="${browser !== selectedBrowser.name}">
					<d2l-vdiff-report-test-result
						browser="${browser}"
						file="${fileData.name}"
						full-mode="${this.fullMode}"
						layout="${this.layout}"
						?show-overlay="${this.showOverlay}"
						test="${testData.name}"></d2l-vdiff-report-test-result>
				</div>
			`;
		};

		return html`<div class="tab-panels">${browsers.map(b => renderTabPanel(b.name))}</div>`;

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
	_triggerNavigation(location) {
		this.dispatchEvent(new CustomEvent(
			'navigation', {
				bubbles: false,
				composed: false,
				detail: {
					location: location
				}
			}
		));
	}
}

customElements.define('d2l-vdiff-report-test', Test);
