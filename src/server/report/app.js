import './button.js';
import { css, html, LitElement, nothing } from 'lit';
import { FILTER_STATUS, FULL_MODE, LAYOUTS } from './common.js';
import { ICON_BROWSERS, ICON_HOME } from './icons.js';
import { RADIO_STYLE, renderRadio } from './radio.js';
import { renderResult, RESULT_STYLE } from './result.js';
import { renderTabButtons, renderTabPanel, TAB_STATUS_TYPE, TAB_STYLE } from './tabs.js';
import { classMap } from 'lit/directives/class-map.js';
import data from './data.js';
import page from 'page';

class App extends LitElement {
	static properties = {
		_files: { state: true },
		_filterFile: { state: true },
		_filterTest: { state: true },
		_fullMode: { state: true },
		_layout: { state: true },
		_overlay: { state: true },
		_selectedBrowserIndex: { state: true }
	};
	static styles = [RADIO_STYLE, RESULT_STYLE, TAB_STYLE, css`
		.container {
			display: grid;
			grid-auto-flow: row;
			grid-template-areas: "sidebar content";
			grid-template-columns: 300px auto;
		}
		aside {
			background-color: #fff;
			border-right: 1px solid #e6e6e6;
			box-shadow: 0 0 6px rgba(0,0,0,.07);
			box-sizing: border-box;
			grid-area: sidebar;
			height: 100vh;
			position: sticky;
			top: 0;
			z-index: 10;
		}
		aside > div {
			padding: 10px;
		}
		main {
			background-color: #fafafa;
			grid-area: content;
		}
		table {
			background-color: #ffffff;
			border-collapse: collapse;
			width: 100%;
		}
		td, th {
			border: 1px solid #dfe6ef;
			padding: 10px;
			text-align: center;
		}
		thead th {
			background-color: #f5f5f5;
		}
		tbody th {
			font-weight: normal;
			text-align: left;
		}
		td.passed {
			background-color: #efffd9;
		}
		td.failed {
			background-color: #ffede8;
		}
		fieldset {
			border: none;
			margin-inline: 0;
			padding-inline: 0;
		}
		fieldset > legend {
			font-weight: bold;
		}
		.padding {
			padding: 20px;
		}
		.test-results {
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
		this._filterBrowsers = data.browsers.map(b => b.name);
		this._filterStatus = data.numFailed > 0 ? FILTER_STATUS.FAILED : FILTER_STATUS.ALL;
		this._fullMode = FULL_MODE.GOLDEN.value;
		this._layout = LAYOUTS.SPLIT.value;
		this._overlay = true;
		this._selectedBrowserIndex = -1;
	}
	connectedCallback() {
		super.connectedCallback();
		this._root = new URL(window.location.href).pathname;
		page(this._root, (ctx) => {
			const searchParams = new URLSearchParams(ctx.querystring);
			if (searchParams.has('file')) {
				this._filterFile = searchParams.get('file');
				if (searchParams.has('test')) {
					this._filterTest = searchParams.get('test');
				} else {
					this._filterTest = undefined;
				}
			} else {
				this._filterFile = undefined;
				this._filterTest = undefined;
			}
			if (searchParams.has('status')) {
				let filterStatus = searchParams.get('status');
				if (filterStatus === FILTER_STATUS.FAILED && data.numFailed === 0) filterStatus = FILTER_STATUS.ALL;
				this._filterStatus = filterStatus;
			}
			if (searchParams.has('browsers')) {
				this._filterBrowsers = searchParams.get('browsers').split(',');
			}
			this._updateFiles();
		});
		page();
	}
	render() {
		let hasPadding = true, view;
		if (this._filterFile !== undefined && this._filterTest !== undefined) {
			const fileData = data.files.find(f => f.name === this._filterFile);
			if (!fileData) {
				view = html`<p>File not found: <b>${this._filterFile}</b>.</p>`;
			} else {
				const testData = fileData.tests.find(t => t.name === this._filterTest);
				if (!testData) {
					view = html`<p>Test not found: <b>${this._filterTest}</b>.</p>`;
				} else {
					hasPadding = false;
					view = this._renderTestResults(fileData, testData);
				}
			}
		} else {
			if (this._files.length === 0) {
				view = html`<p>No tests exist for the selected filters.</p>`;
			} else {
				view = this._files.map(f => this._renderFile(f));
			}
		}
		if (hasPadding) {
			view = html`<div class="padding">${view}</div>`;
		}
		return html`
			<div class="container">
				<aside>
					<div>
						<h1>Visual-diff Results</h1>
						${this._renderFilters()}
					</div>
				</aside>
				<main>${view}</main>
			</div>
		`;
	}
	_handleBackClick() {
		this._updateSearchParams({ file: undefined, test: undefined });
	}
	_handleFilterBrowserChange(e) {
		const browsers = data.browsers.map(b => b.name).filter(b => {
			if (b === e.target.value) {
				return e.target.checked;
			} else {
				return this._filterBrowsers.includes(b);
			}
		});
		this._updateSearchParams({ browsers: browsers.join(',') });
	}
	_handleFilterStatusChange(e) {
		this._updateSearchParams({ status: e.target.value });
	}
	_handleOverlayChange(e) {
		this._overlay = e.target.checked;
	}
	_handleTestClick(e) {
		this._updateSearchParams({ file: e.target.dataset.file, test: e.target.dataset.test });
		return false;
	}
	_renderFile(file) {
		const renderBrowserCell = (b) => {
			if (!this._filterBrowsers.includes(b.name)) return nothing;
			return html`<th>${b.name}</th>`;
		};
		return html`
			<h2>${file.name}</h2>
			<table>
				<thead>
					<tr>
						<th style="text-align: left;">Test</th>
						${data.browsers.map(b => renderBrowserCell(b))}
					</tr>
				</thead>
				<tbody>
					${file.tests.map(t => this._renderTestResultRow(file, t))}
				</tbody>
			</table>
		`;
	}
	_renderFilters() {

		const statusFilters = [
			{ name: FILTER_STATUS.FAILED, count: data.numFailed },
			{ name: FILTER_STATUS.PASSED, count: data.numTests - data.numFailed },
			{ name: FILTER_STATUS.ALL, count: data.numTests }
		];

		const renderStatusFilter = (f) => {
			if (f.count === 0) return nothing;
			return html`
				<label>
					<input type="radio" name="status" value="${f.name}" ?checked="${this._filterStatus === f.name}" @click="${this._handleFilterStatusChange}">
					${f.name} (${f.count})
				</label><br>`;
		};

		const renderBrowser = (b) => {
			const browserData = data.browsers.find(data => data.name === b.name);
			const result = `${(data.numTests - browserData.numFailed)}/${data.numTests}`;
			return html`
				<label>
					<input type="checkbox" value="${b.name}" ?checked="${this._filterBrowsers.includes(b.name)}" @click="${this._handleFilterBrowserChange}">
					${b.name} (${result} passed)
				</label><br>
			`;
		};

		const browserFilter = data.browsers.length > 1 ? html`
			<fieldset>
				<legend>Browsers</legend>
				${ data.browsers.map(b => renderBrowser(b))}
			</fieldset>` : nothing;

		return html`
			<fieldset>
				<legend>Test Status</legend>
				${statusFilters.map(f => renderStatusFilter(f))}
			</fieldset>
			${browserFilter}
		`;

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
	_renderTestResultRow(file, test) {
		const results = data.browsers.map(b => {
			if (!this._filterBrowsers.includes(b.name)) return nothing;
			const result = test.results.find(r => r.name === b.name);
			const passed = (result !== undefined) ? result.passed : true;
			const text = passed ? 'passed' : 'failed';
			return html`<td class="${text}">${text}</td>`;
		});
		const searchParams = new URLSearchParams(window.location.search);
		searchParams.set('file', file.name);
		searchParams.set('test', test.name);
		return html`
			<tr>
				<th style="text-align: left;"><a href="${this._root}?${searchParams.toString()}" @click="${this._handleTestClick}" data-file="${file.name}" data-test="${test.name}">${test.name}</a></th>
				${results}
			</tr>
		`;
	}
	_renderTestResults(fileData, testData) {

		let fullMode = nothing;
		if (this._layout === LAYOUTS.FULL.value) {
			fullMode = renderRadio(
				'fullMode',
				this._fullMode,
				(val) => this._fullMode = val,
				[FULL_MODE.GOLDEN, FULL_MODE.NEW]
			);
		}

		const browsers = data.browsers.filter(b => this._filterBrowsers.includes(b.name));
		const selectedBrowser = browsers[this._selectedBrowserIndex] ||
		browsers.find(b => testData.results.find(r => r.name === b.name && !r.passed)) ||
		browsers[0];
		const selectedResult = testData.results.find(r => r.name === selectedBrowser.name);

		const tabs = browsers.map((b) => {
			const result = testData.results.find(r => r.name === b.name);
			return {
				content: html`<div style="padding: 20px;">${renderResult(result, { fullMode: this._fullMode, layout: this._layout, showOverlay: this._overlay })}</div>`,
				label: b.name,
				id: b.name.toLowerCase(),
				selected: b.name === selectedBrowser.name,
				status: result.passed ? 'passed' : 'failed',
				statusType: result.passed ? TAB_STATUS_TYPE.NORMAL : TAB_STATUS_TYPE.ERROR
			};
		});

		return html`
			<div class="test-results">
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
						${renderRadio('layout', this._layout, (val) => this._layout = val, [LAYOUTS.FULL, LAYOUTS.SPLIT])}
						<label class="settings-box"><input type="checkbox" ?checked="${this._overlay}" @change="${this._handleOverlayChange}">Overlay Difference</label>
						${fullMode}
					</div>
					${this._renderTabButtons(tabs)}
				</div>
				${this._renderTabPanels(tabs)}
				${this._renderFooter(selectedBrowser, selectedResult)}
			</div>
		`;

	}
	_updateFiles() {

		const files = [];
		let foundFilterTest = false;

		data.files.forEach(f => {
			const tests = [];
			f.tests.forEach(t => {
				const results = t.results.filter(r => {
					if (!this._filterBrowsers.includes(r.name)) return false;
					if (!r.passed && this._filterStatus === FILTER_STATUS.PASSED) return false;
					if (r.passed && this._filterStatus === FILTER_STATUS.FAILED) return false;
					return true;
				});
				if (results.length > 0) {
					tests.push({ ...t, results });
					if (t.name === this._filterTest) {
						foundFilterTest = true;
					}
				}
			});
			if (tests.length > 0) {
				files.push({ ...f, tests });
			}
		});

		if (this._filterTest !== undefined && !foundFilterTest) {
			this._updateSearchParams({ file: undefined, test: undefined });
			return;
		}
		this._files = files;

	}
	_updateSearchParams(params) {
		const searchParams = new URLSearchParams(window.location.search);
		for (const name in params) {
			if (params[name] === undefined) {
				searchParams.delete(name);
			} else {
				searchParams.set(name, params[name]);
			}
		}
		page.redirect(`${this._root}?${searchParams.toString()}`);
	}
}
customElements.define('d2l-vdiff-report-app', App);
