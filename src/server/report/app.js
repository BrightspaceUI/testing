import './button.js';
import { COMMON_STYLE, FILTER_STATUS, FULL_MODE, LAYOUTS, renderEmpty, renderTestStatus } from './common.js';
import { css, html, LitElement, nothing } from 'lit';
import { ICON_NEXT, ICON_PREV } from './icons.js';
import { RADIO_STYLE, renderRadio } from './radio.js';
import { renderBrowserResults, RESULT_STYLE } from './result.js';
import { renderTabButtons, renderTabPanel, TAB_STYLE } from './tabs.js';
import data from './data.js';

class App extends LitElement {
	static properties = {
		_files: { state: true },
		_filterHideByteDiff: { state: true },
		_filterFile: { state: true },
		_filterTest: { state: true },
		_fullMode: { state: true },
		_layout: { state: true },
		_overlay: { state: true }
	};
	static styles = [COMMON_STYLE, RADIO_STYLE, RESULT_STYLE, TAB_STYLE, css`
		:host {
			display: grid;
			grid-template-columns: 275px auto;
			height: 100vh;
			overflow: hidden;
		}
		aside {
			background-color: #ffffff;
			border-right: 1px solid #e6e6e6;
			box-shadow: 0 0 6px rgba(0, 0, 0, 0.07);
			padding: 20px;
		}
		main {
			background-color: #fafafa;
			overflow-y: scroll;
		}
		main > .item-container:first-child {
			padding-top: 20px;
		}
		.list-file-title {
			padding-bottom: 20px;
		}
		table {
			background-color: #ffffff;
			border-collapse: collapse;
			width: 100%;
		}
		td, th {
			border: 1px solid #cdd5dc;
			padding: 10px;
			text-align: center;
			white-space: nowrap;
		}
		thead th {
			background-color: #f5f5f5;
		}
		tbody th {
			font-weight: normal;
			text-align: left;
			white-space: normal;
			width: 100%;
		}
		td.byte-diff {
			background-color: #fbf9c6;
		}
		td.passed {
			background-color: #efffd9;
		}
		td.failed {
			background-color: #ffede8;
		}
		fieldset {
			border: none;
			margin: 20px 0;
			padding: 0;
		}
		fieldset > legend {
			font-weight: bold;
		}
		.test-results {
			display: grid;
			grid-template-rows: auto 1fr auto;
			height: 100vh;
		}
		.header {
			background-color: #f0f0f0;
			border-bottom: 1px solid #cdd5dc;
			box-shadow: 0 0 6px rgba(0, 0, 0, 0.07);
		}
		.tab-panels {
			overflow: auto;
		}
		.title {
			align-items: center;
			display: flex;
			font-size: 1.5rem;
			gap: 5px;
			padding: 20px 20px 0 20px;
		}
		.title h2 {
			font-size: inherit;
		}
		.settings {
			align-items: center;
			display: flex;
			gap: 10px;
			padding: 20px;
		}
		.settings > * {
			flex: 0 0 auto;
		}
		.settings > .spacer {
			flex: 1 1 auto;
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
		this._files = [];
		this._filterBrowsers = data.browsers.map(b => b.name);
		this._filterHideByteDiff = false;
		this._filterStatus = data.numFailed > 0 ? FILTER_STATUS.FAILED : FILTER_STATUS.ALL;
		this._fullMode = FULL_MODE.GOLDEN.value;
		this._layout = LAYOUTS.SPLIT.value;
		this._overlay = true;
		this._selectedBrowserIndex = -1;
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('click', this.#handleClickBound);
		window.addEventListener('popstate', this.#handleLocationChangeBound);
		this.#handleLocationChangeBound();
		this._root = new URL(window.location.href).pathname;
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		window.removeEventListener('click', this.#handleClickBound);
		window.removeEventListener('popstate', this.#handleLocationChangeBound);
	}
	render() {
		return html`
			<aside>
				<div>
					<h1>Visual-Diff Report</h1>
					${this._renderFilters()}
				</div>
			</aside>
			<main>${this._renderMainView()}</main>
		`;
	}

	#handleClickBound = this.#handleClick.bind(this);
	#handleLocationChangeBound = this.#handleLocationChange.bind(this);

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
	_handleFilterByteDiffChange(e) {
		this._updateSearchParams({ bytediff: !e.target.checked ? undefined : '1' });
	}
	_handleFilterStatusChange(e) {
		this._updateSearchParams({ status: e.target.value });
	}
	_handleNextClick() {
		this._updateSearchParams(this._next);
		this._scrollToTop();
	}
	_handleOverlayChange(e) {
		this._overlay = e.target.checked;
	}
	_handlePrevClick() {
		this._updateSearchParams(this._prev);
		this._scrollToTop();
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
			return html`
				<label>
					<input type="checkbox" value="${b.name}" ?checked="${this._filterBrowsers.includes(b.name)}" @click="${this._handleFilterBrowserChange}">
					${b.name} ${renderTestStatus(data.numTests - browserData.numFailed, data.numTests)}
				</label><br>
			`;
		};

		const browserFilter = data.browsers.length > 1 ? html`
			<fieldset>
				<legend>Browsers</legend>
				${ data.browsers.map(b => renderBrowser(b))}
			</fieldset>` : nothing;

		const browserDiffs = data.browsers.reduce((acc, b) => {
			const previousVersion = b.previousVersion || 'unknown';
			if (previousVersion === b.version) {
				return acc;
			}
			return acc.push(html`
				<li>${b.name}: <strong>${previousVersion}</strong> to <strong>${b.version}</strong></li>
			`) && acc;
		}, []);
		const browserDiffInfo = browserDiffs.length > 0 ? html`
			<div class="browser-diff">
				<div class="browser-diff-title">Browser Version Changes</div>
				<ul>${browserDiffs}</ul>
			</div>
		` : nothing;

		const systemDiffs = Object.entries(data.system).reduce((acc, [k, v]) => {
			const previous = data.system.previous[k] || 'unknown';
			if (k === 'previous' || previous === v) {
				return acc;
			}
			return acc.push(html`
				<li>${k}: <strong>${data.system.previous[k]}</strong> to <strong>${v}</strong></li>
			`) && acc;
		}, []);
		const systemDiffInfo = systemDiffs.length ? html`
			<div class="browser-diff">
				<div class="browser-diff-title">System Changes</div>
				<ul>${systemDiffs}</ul>
			</div>
		` : nothing;

		const byteDiffFilter = (data.numByteDiff > 0) ? html`
			<fieldset>
				<legend>Byte Diffs</legend>
				<label>
					<input type="checkbox" ?checked="${this._filterHideByteDiff}" @change="${this._handleFilterByteDiffChange}">
					Hide tests with only file size differences (${data.numByteDiff})
				</label>
			</fieldset>
		` : nothing;

		return html`
			<fieldset>
				<legend>Test Status</legend>
				${statusFilters.map(f => renderStatusFilter(f))}
			</fieldset>
			${byteDiffFilter}
			${browserFilter}
			${browserDiffInfo}
			${systemDiffInfo}
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
			<div class="item-container">
				<div class="list-file-title">
					<h2><a href="${this._root}?${searchParams.toString()}">${file.name}</a></h2>
				</div>
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
			</div>
		`;
	}
	_renderListFileTest(file, test) {
		const results = data.browsers.map(b => {
			if (!this._filterBrowsers.includes(b.name)) return nothing;
			const result = test.results.find(r => r.name === b.name);
			const passed = (result !== undefined) ? result.passed : true;
			const text = passed ? 'passed' : (result.bytediff ? 'byte-diff' : 'failed');
			return html`<td class="${text}">${text}</td>`;
		});
		const searchParams = new URLSearchParams(window.location.search);
		searchParams.set('file', file.name);
		searchParams.set('test', test.name);
		return html`
			<tr>
				<th style="text-align: left;"><a href="${this._root}?${searchParams.toString()}">${test.name}</a></th>
				${results}
			</tr>
		`;
	}
	_renderMainView() {

		if (this._filterFile === undefined) {
			if (this._files.length === 0) {
				return renderEmpty();
			} else {
				return this._files.map(f => this._renderListFile(f));
			}
		}

		const fileData = this._files.find(f => f.name === this._filterFile);
		if (!fileData) {
			return renderEmpty();
		}

		const tests = fileData.tests.filter(t => {
			return this._filterTest === undefined || t.name === this._filterTest;
		});
		if (tests.length === 0) {
			return renderEmpty();
		}

		return this._renderTestResults(fileData, tests);

	}
	_renderTabButtons(tabs) {
		if (tabs.length < 2) return nothing;
		return renderTabButtons('browser results', tabs, index => {
			this._selectedBrowserIndex = index;
			this._scrollToTop();
			this.requestUpdate();
		});
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

		if (!browsers[this._selectedBrowserIndex]) {
			this._selectedBrowserIndex = Math.max(
				browsers.findIndex((b) => browserResults.get(b.name) < tests.length),
				0
			);
		}
		const selectedBrowser = browsers[this._selectedBrowserIndex];

		const tabs = browsers.map((b) => {
			const numPassed = browserResults.get(b.name);
			return {
				content: renderBrowserResults(b, tests, { filterHideByteDiff: this._filterHideByteDiff, filterStatus: this._filterStatus, fullMode: this._fullMode, layout: this._layout, showOverlay: this._overlay }),
				label: b.name,
				id: b.name.toLowerCase(),
				selected: b.name === selectedBrowser.name,
				status: renderTestStatus(numPassed, tests.length)
			};
		});

		const homeSearchParams = new URLSearchParams(window.location.search);
		homeSearchParams.delete('file');
		homeSearchParams.delete('test');

		return html`
			<div class="test-results">
				<div class="header">
					<div class="title">
						<a href="${this._root}?${homeSearchParams.toString()}">Home</a>
						<span>&nbsp;&gt;&nbsp;</span>
						<h2>${fileData.name}</h2>
					</div>
					<div class="settings">
						${renderRadio('layout', this._layout, (val) => this._layout = val, [LAYOUTS.FULL, LAYOUTS.SPLIT])}
						<label class="settings-box"><input type="checkbox" ?checked="${this._overlay}" @change="${this._handleOverlayChange}">Overlay Difference</label>
						${fullMode}
						<div class="spacer"></div>
						<d2l-vdiff-report-button ?disabled="${this._prev === undefined}" text="Prev" @click="${this._handlePrevClick}">${ICON_PREV}</d2l-vdiff-report-button>
						<d2l-vdiff-report-button ?disabled="${this._next === undefined}" text="Next" @click="${this._handleNextClick}">${ICON_NEXT}</d2l-vdiff-report-button>
					</div>
					${this._renderTabButtons(tabs)}
				</div>
				${this._renderTabPanels(tabs)}
			</div>
		`;

	}
	_scrollToTop() {
		this.shadowRoot.querySelector('.tab-panels').scrollTo(0, 0);
	}
	_updateFiles() {

		const files = [];
		let foundFilterTest = false;
		let lookingForNextFile = false;
		let lookingForNextTest = false;
		let prevFile, prevTest;

		this._next = undefined;
		this._prev = undefined;

		data.files.forEach(f => {
			const tests = [];
			f.tests.forEach(t => {
				let numStatusMatch = 0;
				t.results.forEach(r => {
					if (this._filterBrowsers.includes(r.name) &&
						((!r.bytediff || !this._filterHideByteDiff) &&
						(this._filterStatus === FILTER_STATUS.ALL ||
						r.passed && this._filterStatus === FILTER_STATUS.PASSED ||
						!r.passed && this._filterStatus === FILTER_STATUS.FAILED))) numStatusMatch++;
				});
				if (numStatusMatch > 0) {
					if (lookingForNextTest) {
						lookingForNextTest = false;
						this._next = { file: f.name, test: t.name };
					}
					if (t.name === this._filterTest && f.name === this._filterFile) {
						foundFilterTest = true;
						lookingForNextTest = true;
						this._prev = prevTest;
					}
					prevTest = { file: f.name, test: t.name };
					tests.push(t);
				}
			});
			if (tests.length > 0) {
				if (this._filterTest === undefined) {
					if (lookingForNextFile) {
						lookingForNextFile = false;
						this._next = { file: f.name };
					}
					if (f.name === this._filterFile) {
						lookingForNextFile = true;
						this._prev = prevFile;
					}
				}
				prevFile = { file: f.name };
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
		this.#navigate(`${this._root}?${searchParams.toString()}`);
	}
	#handleClick(e) {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;

		let el;
		const eventPath = e.composedPath();
		for (let i = 0; i < eventPath.length; i++) {
			if (eventPath[i].nodeName?.toUpperCase() !== 'A' || !eventPath[i]?.href) continue;
			el = eventPath[i];
			break;
		}
		if (!el) return;

		e.preventDefault();
		this.#navigate(`${el.pathname}${el.search}`);
	}
	#handleLocationChange() {
		const searchParams = new URLSearchParams(new URL(window.location.href).search);
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
			this._selectedBrowserIndex = -1;
		}
		if (searchParams.has('status')) {
			let filterStatus = searchParams.get('status');
			if (filterStatus === FILTER_STATUS.FAILED && data.numFailed === 0) {
				filterStatus = FILTER_STATUS.ALL;
			}
			this._filterStatus = filterStatus;
		}
		if (searchParams.has('browsers')) {
			this._filterBrowsers = searchParams.get('browsers').split(',');
		}
		this._filterHideByteDiff = searchParams.has('bytediff');
		this._updateFiles();
	}
	#navigate(path) {
		window.history.pushState({}, '', path);
		this.#handleLocationChange();
	}
}
customElements.define('d2l-vdiff-report-app', App);
