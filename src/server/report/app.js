import './test-result.js';
import { css, html, LitElement } from 'lit';
import data from './data.js';
import page from 'page';

class App extends LitElement {
	static properties = {
		_filterFile: { state: true },
		_filterTest: { state: true },
		_mode: { state: true },
		_overlay: { state: true }
	};
	static styles = [css`
		table {
			border-collapse: collapse;
		}
		td, th {
			border: 1px solid #cdd5dc;
			padding: 10px;
		}
		thead th {
			background-color: #f9fbff;
		}
		tbody th {
			font-weight: normal;
			text-align: left;
		}
	`];
	constructor() {
		super();
		this._mode = 'sideBySide';
		this._overlay = true;
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
			view = data.files.map(f => this._renderFile(f));
		}
		return html`
			<header>
				<h1>Visual-diff Results</h1>
			</header>
			<main>${view}</main>
		`;
	}
	_goHome() {
		page(this._root);
	}
	_handleModeChange(e) {
		this._mode = e.target.options[e.target.selectedIndex].value;
	}
	_handleOverlayChange(e) {
		this._overlay = e.target.checked;
	}
	_renderFile(file) {
		return html`
			<h2>${file.name}</h2>
			<table>
				<thead>
					<tr>
						<th>Test</th>
						${data.browsers.map(b => html`<th>${b.name}</th>`)}
					</tr>
				</thead>
				<tbody>
					${file.tests.map(t => this._renderTestResultRow(file, t))}
				</tbody>
			</table>
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
		const results = test.results.map(r => {
			return html`<td>${r.passed.toString()}</td>`;
		});
		return html`
			<tr>
				<th><a href="./?file=${encodeURIComponent(file.name)}&test=${encodeURIComponent(test.name)}">${test.name}</a></th>
				${results}
			</tr>
		`;
	}
}
customElements.define('d2l-vdiff-report-app', App);
