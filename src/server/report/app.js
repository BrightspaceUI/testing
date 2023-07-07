import './test-result.js';
import { css, html, LitElement, nothing } from 'lit';
import data from './data.js';
import page from 'page';

const FILTER_STATUS = {
	ALL: 'All',
	PASSED: 'Passed',
	FAILED: 'Failed'
};

class App extends LitElement {
	static properties = {
		_files: { state: true },
		_filterFile: { state: true },
		_filterTest: { state: true },
		_mode: { state: true },
		_overlay: { state: true }
	};
	static styles = [css`
		.container {
			display: grid;
			grid-auto-flow: row;
			grid-template-areas: "sidebar content";
			grid-template-columns: 300px auto;
		}
		aside {
			background-color: #fff;
			border: 1px solid #e6e6e6;
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
		main > div {
			padding: 20px;
		}
		table {
			background-color: #ffffff;
			border-collapse: collapse;
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
	`];
	constructor() {
		super();
		this._filterBrowsers = data.browsers.map(b => b.name);
		this._filterStatus = data.numFailed > 0 ? FILTER_STATUS.FAILED : FILTER_STATUS.ALL;
		this._mode = 'sideBySide';
		this._overlay = true;
		this._updateFiles();
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
		});
		page();
	}
	render() {
		let view;
		if (this._filterFile !== undefined && this._filterTest !== undefined) {
			const fileData = data.files.find(f => f.name === this._filterFile);
			if (!fileData) {
				view = html`<p>File not found: <b>${this._filterFile}</b>.</p>`;
			} else {
				const testData = fileData.tests.find(t => t.name === this._filterTest);
				if (!testData) {
					view = html`<p>Test not found: <b>${this._filterTest}</b>.</p>`;
				} else {
					view = this._renderTest(fileData, testData);
				}
			}
		} else {
			if (this._files.length === 0) {
				view = html`<p>No tests exist for the selected filters.</p>`;
			} else {
				view = this._files.map(f => this._renderFile(f));
			}
		}
		return html`
			<div class="container">
				<aside>
					<div>
						<h1>Visual-diff Results</h1>
						${this._renderFilters()}
					</div>
				</aside>
				<main><div>${view}</div></main>
			</div>
		`;
	}
	_goHome() {
		page(this._root);
	}
	_handleFilterBrowserChange(e) {
		const index = this._filterBrowsers.indexOf(e.target.value);
		if (!e.target.checked && index > -1) {
			this._filterBrowsers.splice(index, 1);
		} else if (e.target.checked && index === -1) {
			this._filterBrowsers.push(e.target.value);
		}
		this._updateFiles();
	}
	_handleFilterStatusChange(e) {
		this._filterStatus = e.target.value;
		this._updateFiles();
	}
	_handleModeChange(e) {
		this._mode = e.target.options[e.target.selectedIndex].value;
	}
	_handleOverlayChange(e) {
		this._overlay = e.target.checked;
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

		return html`
			<fieldset>
				<legend>Test Status</legend>
				${statusFilters.map(f => renderStatusFilter(f))}
			</fieldset>
			<fieldset>
				<legend>Browsers</legend>
				${ data.browsers.map(b => renderBrowser(b))}
			</fieldset>
		`;

	}
	_renderTest(file, test) {
		return html`
			<h2>${test.name} (${(test.results.length - test.numFailed)}/${test.results.length} passed)</h2>
			<div>
				<label>Mode:
					<select @change="${this._handleModeChange}">
						<option value="sideBySide" ?selected="${this._mode === 'sideBySide'}">Side-by-side</option>
						<option value="oneUpOriginal" ?selected="${this._mode === 'oneUpOriginal'}">One-up (original)</option>
						<option value="oneUpNew" ?selected="${this._mode === 'oneUpNew'}">One-up (new)</option>
					</select>
				</label>
				<label><input type="checkbox" ?checked="${this._overlay}" @change="${this._handleOverlayChange}">Show overlay</label>
			</div>
			${test.results.map(r => html`<d2l-vdiff-report-test-result browser="${r.name}" mode="${this._mode}" file="${file.name}" ?show-overlay="${this._overlay}" test="${test.name}"></d2l-vdiff-report-test-result>`)}
			<div style="margin-top: 20px;">
				<button @click="${this._goHome}">Back</button>
			</div>
		`;
	}
	_renderTestResultRow(file, test) {
		const results = data.browsers.map(b => {
			if (!this._filterBrowsers.includes(b.name)) return nothing;
			const result = test.results.find(r => r.name === b.name);
			const passed = (result !== undefined) ? result.passed : true;
			const text = passed ? 'passed' : 'failed';
			return html`<td class="${text}">${text}</td>`;
		});
		return html`
			<tr>
				<th style="text-align: left;"><a href="./?file=${encodeURIComponent(file.name)}&test=${encodeURIComponent(test.name)}">${test.name}</a></th>
				${results}
			</tr>
		`;
	}
	_updateFiles() {
		const files = [];
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
				}
			});
			if (tests.length > 0) {
				files.push({ ...f, tests });
			}
		});
		this._files = files;
	}
}
customElements.define('d2l-vdiff-report-app', App);
