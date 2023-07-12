import './button.js';
import { css, html, LitElement, nothing } from 'lit';
import { FULL_MODE, LAYOUTS } from './common.js';
import { ICON_BROWSERS, ICON_HOME, ICON_TADA } from './icons.js';
import { RADIO_STYLE, renderRadio } from './radio.js';
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
	static styles = [RADIO_STYLE, TAB_STYLE, css`
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
		.result {
			padding: 20px;
		}
		.result-split {
			flex-direction: row;
			flex-wrap: nowrap;
			display: flex;
		}
		.result-split > .result-part {
			flex: 0 1 auto;
		}
		.result-split-divider {
			border-right: 4px dashed #007bff;
			flex: 0 0 auto;
		}
		.result-part {
			display: inline-block;
		}
		.result-diff-container img {
			max-width: 100%;
		}
		.result-diff-container {
			background: repeating-conic-gradient(#cdd5dc 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
			background-position: 0 0;
			border: 2px dashed #90989d;
			display: inline-block;
			line-height: 0;
			position: relative;
		}
		.result-split > .result-part:first-of-type > .result-diff-container {
			border-right: none;
		}
		.result-split > .result-part:last-of-type > .result-diff-container {
			border-left: none;
		}
		.result-overlay {
			background: hsla(0,0%,100%,.8);
			position: absolute;
			top: 0;
			left: 0;
		}
		.result-part-info {
			align-items: center;
			display: flex;
		}
		.result-part-info-spacer,
		.result-part-info-size {
			flex: 1 0 0%;
		}
		.result-part-info-name {
			flex: 0 0 auto;
			font-weight: bold;
			padding: 5px;
		}
		.result-part-info-size {
			color: #90989d;
			font-size: 0.8rem;
		}
		.result-no-changes {
			align-items: center;
			display: flex;
			flex-direction: column;
			gap: 20px;
			padding: 20px;
			min-width: 210px;
		}
		.result-no-changes > p {
			color: #6e7477;
			font-size: 1.1rem;
			font-weight: bold;
			margin: 0;
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
				content: this._renderTestResults(result),
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
	_renderTestResult(resultData) {

		if (!resultData.passed && resultData.info === undefined) {
			return html`
				<p>An error occurred that prevented a visual-diff snapshot from being taken:</p>
				<pre>${resultData.error}</pre>
			`;
		}

		const renderPart = (label, partInfo, noChanges, overlay) => {
			const img = noChanges ? html`
				<div class="result-no-changes">
					${ICON_TADA}
					<p>Hooray! No changes here.</p>
				</div>
			` : html`<div class="result-diff-container"><img src="../${partInfo.path}" loading="lazy" alt="">${overlay}</div>`;
			return html`
				<div class="result-part">
					<div class="result-part-info">
						<div class="result-part-info-spacer"></div>
						<div class="result-part-info-name">${label}</div>
						<div class="result-part-info-size">(${partInfo.width} x ${partInfo.height})</div>
					</div>
					${img}
				</div>
			`;
		};

		const overlay = (this.showOverlay && !resultData.passed) ?
			html`<div class="result-overlay"><img src="../${resultData.info.diff}" loading="lazy" alt=""></div>` : nothing;

		if (this.layout === LAYOUTS.SPLIT.value) {
			return html`
				<div class="result-split">
					${ renderPart('golden', resultData.info.golden, false, undefined) }
					<div class="result-split-divider"></div>
					${ renderPart('new', resultData.info.new, resultData.passed, overlay) }
				</div>`;
		} else if (this.layout === LAYOUTS.FULL.value) {
			if (this.fullMode === FULL_MODE.GOLDEN.value) {
				return renderPart('golden', resultData.info.golden, false, overlay);
			} else {
				return renderPart('new', resultData.info.new, false, overlay);
			}
		}

	}
	_renderTestResults(result) {
		return html`
			<div class="result">
				${this._renderTestResult(result)}
			</div>
		`;
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
