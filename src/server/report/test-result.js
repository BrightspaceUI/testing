import { css, html, LitElement, nothing } from 'lit';
import data from './data.js';

class TestResult extends LitElement {
	static properties = {
		browser: { type: String },
		mode: { type: String },
		file: { type: String },
		showOverlay: { attribute: 'show-overlay', type: Boolean },
		test: { type: String },
	};
	static styles = [css`
		.side-by-side {
			flex-direction: row;
			flex-wrap: nowrap;
			display: flex;
			gap: 10px;
		}
		.side-by-side > div {
			flex: 0 1 auto;
		}
		img {
			max-width: 100%;
		}
		.diff-container {
			background: repeating-conic-gradient(#cccccc 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
			background-position: 0 0;
			border: 1px solid #cccccc;
			display: inline-block;
			line-height: 0;
		}
		.overlay-container {
			position: relative;
		}
		.overlay {
			background: hsla(0,0%,100%,.8);
			position: absolute;
			top: 0;
			left: 0;
		}
		.no-changes {
			border: 1px solid #cccccc;
			padding: 20px;
		}
	`];
	render() {

		const { browserData, fileData, resultData, testData } = this._fetchData();
		if (!browserData || !fileData || !resultData || !testData) return nothing;

		return html`
			<h3>${resultData.name} v${browserData.version} (${resultData.duration}ms)</h3>
			${this._renderBody(resultData)}
		`;

	}
	_fetchData() {

		const fileData = data.files.find(f => f.name === this.file);
		if (!fileData) return {};

		const testData = fileData.tests.find(t => t.name === this.test);
		if (!testData) return {};

		const resultData = testData.results.find(r => r.name === this.browser);
		if (!resultData) return {};

		const browserData = data.browsers.find(b => b.name === this.browser);
		if (!browserData) return {};

		return { browserData, fileData, resultData, testData };

	}
	_renderBody(resultData) {

		if (!resultData.passed && resultData.info === undefined) {
			return html`
				<p>An error occurred that prevented a visual-diff snapshot from being taken:</p>
				<pre>${resultData.error}</pre>
			`;
		}

		const noChanges = html`<div class="no-changes">No changes</div>`;
		const goldenImage = html`<img src="../${resultData.info.golden.path}" loading="lazy" alt="">`;
		const newImage = html`<img src="../${resultData.info.new.path}" loading="lazy" alt="">`;

		const overlay = (this.showOverlay && !resultData.passed) ?
			html`<div class="overlay"><img src="../${resultData.info.diff}" loading="lazy" alt=""></div>` : nothing;

		if (this.mode === 'sideBySide') {
			const g = html`<div class="diff-container">${goldenImage}</div>`;
			return html`
				<div class="side-by-side">
					${ resultData.passed ? noChanges : g }
					<div class="diff-container overlay-container">${newImage}${overlay}</div>
				</div>`;
		} else {
			return html`
				<div>
					<div class="diff-container overlay-container">
						${(this.mode === 'oneUpOriginal') ? goldenImage : newImage}
						${overlay}
					</div>
				</div>`;
		}

	}
}

customElements.define('d2l-vdiff-report-test-result', TestResult);
