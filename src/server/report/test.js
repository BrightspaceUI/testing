import './button.js';
import { css, html, LitElement, nothing } from 'lit';
import { FULL_MODE, LAYOUTS } from './common.js';
import { ICON_BROWSERS, ICON_HOME } from './icons.js';
import { RADIO_STYLE, renderRadio } from './radio.js';
import { renderResult, RESULT_STYLE } from './result.js';
import { renderTabButtons, renderTabPanel, TAB_STATUS_TYPE, TAB_STYLE } from './tabs.js';
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
	static styles = [RADIO_STYLE, RESULT_STYLE, TAB_STYLE, css`
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
			fullMode = renderRadio(
				'fullMode',
				this.fullMode,
				(val) => this._triggerChange('fullMode', val),
				[FULL_MODE.GOLDEN, FULL_MODE.NEW]
			);
		}

		const selectedBrowser = this._getSelectedBrowser(browsers, testData);
		const selectedResult = testData.results.find(r => r.name === selectedBrowser.name);

		const tabs = browsers.map((b) => {
			const result = testData.results.find(r => r.name === b.name);
			return {
				content: html`<div style="padding: 20px;">${renderResult(result, { fullMode: this.fullMode, layout: this.layout, showOverlay: this.showOverlay })}</div>`,
				label: b.name,
				id: b.name.toLowerCase(),
				selected: b.name === selectedBrowser.name,
				status: result.passed ? 'passed' : 'failed',
				statusType: result.passed ? TAB_STATUS_TYPE.NORMAL : TAB_STATUS_TYPE.ERROR
			};
		});

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
					${renderRadio('layout', this.layout, (val) => this._triggerChange('layout', val), [LAYOUTS.FULL, LAYOUTS.SPLIT])}
					<label class="settings-box"><input type="checkbox" ?checked="${this.showOverlay}" @change="${this._handleOverlayChange}">Overlay Difference</label>
					${fullMode}
				</div>
				${this._renderTabButtons(tabs)}
			</div>
			${this._renderTabPanels(tabs)}
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
	_getSelectedBrowser(browsers, { results }) {
		return browsers[this._selectedBrowserIndex] ||
			browsers.find(b => results.find(r => r.name === b.name && !r.passed)) ||
			browsers[0];
	}
	_handleBackClick() {
		this._triggerNavigation('home');
	}
	_handleOverlayChange(e) {
		this._triggerChange('overlay', e.target.checked);
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
	_renderTabButtons(tabs) {
		if (tabs.length < 2) return nothing;
		return renderTabButtons('browser results', tabs, index => this._selectedBrowserIndex = index);
	}
	_renderTabPanels(tabs) {

		let panelsContent;
		if (tabs.length < 2) {
			panelsContent = tabs.map(t => t.content);
		} else {
			panelsContent = tabs.map(t => renderTabPanel(t));
		}

		return html`<div class="tab-panels">${panelsContent}</div>`;

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
