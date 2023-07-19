import './button.js';
import { css, html, LitElement, nothing } from 'lit';
import { FILTER_STATUS, FULL_MODE, LAYOUTS } from './common.js';
import { ICON_EMPTY, ICON_HOME } from './icons.js';
import { RADIO_STYLE, renderRadio } from './radio.js';
import { renderBrowserResults, RESULT_STYLE } from './result.js';
import { renderTabButtons, renderTabPanel, TAB_STATUS_TYPE, TAB_STYLE } from './tabs.js';
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
		.padding {
			padding: 20px;
		}
		.test-results {
			display: grid;
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				'header'
				'content';
			height: 100vh;
		}
		.header {
			background-color: #f0f0f0;
			border-bottom: 1px solid #cdd5dc;
			box-shadow: 0 0 6px rgba(0,0,0,.07);
			grid-area: header;
		}
		.tab-panels {
			grid-area: content;
			overflow: auto;
		}
		.title {
			align-items: center;
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
		return html`
			<div class="container">
				<aside>
					<div>
						<h1>Visual-diff Results</h1>
						${this._renderFilters()}
					</div>
				</aside>
				<main>${this._renderMainView()}</main>
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
	_handleListTestClick(e) {
		this._updateSearchParams({ file: e.target.dataset.file, test: e.target.dataset.test });
		return false;
	}
	_handleOverlayChange(e) {
		this._overlay = e.target.checked;
	}
	_renderEmpty() {
		return html`
			<div class="empty padding">
				${ICON_EMPTY}
				<p>No tests exist for the selected filters.</p>
			</div>`;
	}
	_renderError(message, source) {
		return html`<div class="padding"><p>${message}: <b>${source}</b>.</p></div>`;
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
	_renderListFile(file) {
		const renderBrowserCell = (b) => {
			if (!this._filterBrowsers.includes(b.name)) return nothing;
			return html`<th>${b.name}</th>`;
		};
		const searchParams = new URLSearchParams(window.location.search);
		searchParams.set('file', file.name);
		searchParams.delete('test');
		return html`
			<h2><a href="${this._root}?${searchParams.toString()}" @click="${this._handleListFileClick}" data-file="${file.name}">${file.name}</a></h2>
			<table>
				<thead>
					<tr>
						<th style="text-align: left;">Test</th>
						${data.browsers.map(b => renderBrowserCell(b))}
					</tr>
				</thead>
				<tbody>
					${file.tests.map(t => this._renderListFileTest(file, t))}
				</tbody>
			</table>
		`;
	}
	_renderListFileTest(file, test) {
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
				<th style="text-align: left;"><a href="${this._root}?${searchParams.toString()}" @click="${this._handleListTestClick}" data-file="${file.name}" data-test="${test.name}">${test.name}</a></th>
				${results}
			</tr>
		`;
	}
	_renderMainView() {

		if (this._filterFile === undefined) {
			let list;
			if (this._files.length === 0) {
				return this._renderEmpty();
			} else {
				list = this._files.map(f => this._renderListFile(f));
			}
			return html`<div class="padding">${list}</div>`;
		}

		const fileData = this._files.find(f => f.name === this._filterFile);
		if (!fileData) {
			return this._renderEmpty();
		}

		const tests = fileData.tests.filter(t => {
			return this._filterTest === undefined || t.name === this._filterTest;
		});
		if (tests.length === 0) {
			return this._renderEmpty();
		}

		return this._renderTestResults(fileData, tests);

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
	_renderTestResults(fileData, tests) {

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
		const browserResults = new Map();
		tests.forEach(t => {
			t.results.forEach(r => {
				if (!browserResults.has(r.name)) {
					browserResults.set(r.name, 0);
				}
				if (r.passed) browserResults.set(r.name, browserResults.get(r.name) + 1);
			});
		});

		const selectedBrowser = browsers[this._selectedBrowserIndex] ||
			browsers.find(b => browserResults.get(b.name) < tests.length) ||
			browsers[0];

		const tabs = browsers.map((b) => {
			const numPassed = browserResults.get(b.name);
			return {
				content: renderBrowserResults(b, tests, { fullMode: this._fullMode, layout: this._layout, showOverlay: this._overlay }),
				label: b.name,
				id: b.name.toLowerCase(),
				selected: b.name === selectedBrowser.name,
				status: `${numPassed}/${tests.length} passed`,
				statusType: (numPassed < tests.length) ? TAB_STATUS_TYPE.ERROR : TAB_STATUS_TYPE.NORMAL
			};
		});

		return html`
			<div class="test-results">
				<div class="header">
					<div class="title">
						<div class="title-info">
							<h2>${fileData.name}</h2>
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
			</div>
		`;

	}
	_updateFiles() {

		const files = [];
		let foundFilterTest = false;

		data.files.forEach(f => {
			const tests = [];
			f.tests.forEach(t => {
				let numStatusMatch = 0;
				t.results.forEach(r => {
					if (this._filterBrowsers.includes(r.name) &&
						(this._filterStatus === FILTER_STATUS.ALL ||
						r.passed && this._filterStatus === FILTER_STATUS.PASSED ||
						!r.passed && this._filterStatus === FILTER_STATUS.FAILED)) numStatusMatch++;
				});
				if (numStatusMatch > 0) {
					tests.push(t);
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
			this._updateSearchParams({ test: undefined });
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
