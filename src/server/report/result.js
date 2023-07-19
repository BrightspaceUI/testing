import { css, html, nothing } from 'lit';
import { FILTER_STATUS, FULL_MODE, LAYOUTS, renderEmpty, renderStatusText, STATUS_TYPE } from './common.js';
import { ICON_BROWSERS, ICON_TADA } from './icons.js';

export const RESULT_STYLE = css`
	.result-browser {
		align-items: center;
		border-bottom: 4px solid #e3e9f1;
		display: flex;
		gap: 10px;
	}
	.result-browser > svg {
		flex: 0 0 auto;
		height: 50px;
		width: 50px;
	}
	.result-browser-name {
		font-size: 1.2rem;
		font-weight: bold;
	}
	.result-container {
		border-bottom: 4px solid #e3e9f1;
		padding: 40px 20px;
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
		min-width: 210px;
	}
	.result-no-changes > p {
		color: #6e7477;
		font-size: 1.1rem;
		font-weight: bold;
		margin: 0;
	}
	.result-test-name {
		align-items: center;
		display: flex;
		padding-bottom: 10px;
	}
	.result-test-name > h3 {
		flex: 1 0 auto;
		margin: 0;
	}
	.result-duration {
		flex: 0 0 auto;
	}
`;

function renderResult(resultData, options) {

	if (!resultData.passed && resultData.info === undefined) {
		return html`
			<p>An error occurred that prevented a visual-diff snapshot from being taken:</p>
			<pre>${resultData.error}</pre>
		`;
	}

	const renderPart = (label, partInfo, noChanges, overlay) => {
		const img = noChanges ? html`
			<div class="result-no-changes padding">
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

	const overlay = (options.showOverlay && !resultData.passed) ?
		html`<div class="result-overlay"><img src="../${resultData.info.diff}" loading="lazy" alt=""></div>` : nothing;

	if (options.layout === LAYOUTS.SPLIT.value) {
		return html`
			<div class="result-split">
				${ renderPart('golden', resultData.info.golden, false, undefined) }
				<div class="result-split-divider"></div>
				${ renderPart('new', resultData.info.new, resultData.passed, overlay) }
			</div>`;
	} else if (options.layout === LAYOUTS.FULL.value) {
		if (options.fullMode === FULL_MODE.GOLDEN.value) {
			return renderPart('golden', resultData.info.golden, false, overlay);
		} else {
			return renderPart('new', resultData.info.new, false, overlay);
		}
	}

}

export function renderBrowserResults(browser, tests, options) {
	const filteredTests = tests.filter(t => {
		const resultData = t.results.find(r => r.name === browser.name);
		if (resultData.passed && options.filterStatus === FILTER_STATUS.FAILED ||
			!resultData.passed && options.filterStatus === FILTER_STATUS.PASSED) {
			return false;
		}
		return true;
	});
	const results = filteredTests.map(t => {
		const resultData = t.results.find(r => r.name === browser.name);
		let status = STATUS_TYPE.NORMAL;
		if (resultData.duration >= 1000) {
			status = STATUS_TYPE.ERROR;
		} else if (resultData.duration >= 500) {
			status = STATUS_TYPE.WARNING;
		}
		return html`
			<div class="result-container">
				<div class="result-test-name">
					<h3>${t.name}</h3>
					<div class="result-duration">${renderStatusText(`${resultData.duration}ms`, status)}</div>
				</div>
				${renderResult(resultData, options)}
			</div>
		`;
	});
	return html`
		<div class="result-browser padding">
			${ICON_BROWSERS[browser.name]}
			<div>
				<div class="result-browser-name">${browser.name}</div>
				<div>version ${browser.version}</div>
			</div>
		</div>
		${filteredTests.length === 0 ? renderEmpty() : results}
	`;
}
