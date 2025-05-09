import { css, html, nothing } from 'lit';
import { FILTER_STATUS, FULL_MODE, LAYOUTS, renderEmpty, renderStatusText, STATUS_TYPE } from './common.js';
import { ICON_BROWSERS, ICON_BYTES, ICON_NO_GOLDEN, ICON_TADA } from './icons.js';
import data from './data.js';

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
	.result-browser-info {
		flex: 1 1 auto;
	}
	.result-browser-name {
		font-size: 1.2rem;
		font-weight: bold;
	}
	.result-split {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
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
	.result-split > .result-part:first-of-type > .result-part-wrapper {
		text-align: right;
	}
	.result-split > .result-part:first-of-type > div > .result-diff-container {
		border-right: none;
	}
	.result-split > .result-part:last-of-type > div > .result-diff-container {
		border-left: none;
	}
	.result-overlay {
		background: hsla(0, 0%, 100%, 0.8);
		cursor: zoom-in;
		left: 0;
		position: absolute;
		top: 0;
	}
	.result-overlay img + img {
		filter:
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red)
			drop-shadow(0 0 0.5px red);
		inset: 0;
		opacity: 0.003;
		position: absolute;
	}
	.result-overlay img + img:active {
		opacity: 1;
	}
	.result-part-info {
		align-items: center;
		display: flex;
		gap: 5px;
		padding: 5px;
	}
	.result-part-info-spacer,
	.result-part-info-size {
		flex: 1 0 0%;
	}
	.result-part-info-name {
		flex: 0 0 auto;
		font-weight: bold;
	}
	.result-part-info-size {
		color: #90989d;
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.result-graphic {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 210px;
	}
	.result-graphic > p {
		color: #90989d;
		font-size: 1.1rem;
		font-weight: bold;
		margin: 0;
		text-align: center;
	}
	.result-graphic > .details {
		font-size: 1rem;
		text-align: left;
	}
	.result-test-name {
		align-items: center;
		display: flex;
		gap: 10px;
		padding-bottom: 10px;
	}
	.result-test-name > h3 {
		flex: 1 0 auto;
		margin: 0;
	}
	.result-duration {
		flex: 0 0 auto;
	}
	.breadcrumb-arrow {
		user-select: none;
	}
`;

function renderBrowserInfo(browser) {

	const previousVersion = data.browsers.find(b => b.name === browser.name).previousVersion || 'unknown';

	let browserDiffInfo = nothing;
	if (previousVersion !== browser.version) {
		browserDiffInfo = html`
			<div class="browser-diff">
				<div class="browser-diff-title">Browser Version Change</div>
				<div><strong>${previousVersion}</strong> (golden) to <strong>${browser.version}</strong> (new)</div>
			</div>`;
	}

	return html`<div class="result-browser padding">
		${ICON_BROWSERS[browser.name]}
		<div class="result-browser-info">
			<div class="result-browser-name">${browser.name}</div>
			<div>version ${browser.version}</div>
		</div>
		${browserDiffInfo}
	</div>`;
}

function renderResult(resultData, options) {

	if (!resultData.passed && resultData.info === undefined) {
		return html`
			<p>An error occurred that prevented a visual-diff snapshot from being taken:</p>
			<pre>${resultData.error}</pre>
		`;
	}

	const renderPart = (label, partInfo, overlay) => {
		return html`
			<div class="result-part">
				<div class="result-part-info">
					<div class="result-part-info-spacer"></div>
					<div class="result-part-info-name">${label}</div>
					<div class="result-part-info-size">(${partInfo.width} x ${partInfo.height})</div>
				</div>
				<div class="result-part-wrapper">
					<div class="result-diff-container"><img src="../${partInfo.path}" loading="lazy" alt="">${overlay}</div>
				</div>
			</div>
		`;
	};

	const goldenExists = (resultData.info.golden !== undefined);

	const overlay = (goldenExists && options.showOverlay && !resultData.passed && resultData.info.diff) ?
		html`
		<div class="result-overlay">
			<img src="../${resultData.info.diff}" loading="lazy" alt="">
			<img src="../${resultData.info.diff}" loading="lazy" alt="">
		</div>` : nothing;

	const goldenPart = !goldenExists ?
		html`<div class="result-graphic padding">${ICON_NO_GOLDEN}<p>No golden exists for this test... yet.</p></div>` :
		renderPart('golden', resultData.info.golden, options.layout === LAYOUTS.SPLIT.value ? undefined : overlay);

	if (options.layout === LAYOUTS.SPLIT.value) {
		let newPart;
		if (resultData.passed) {
			newPart = html`<div class="result-graphic padding">${ICON_TADA}<p>Hooray! No changes here.</p></div>`;
		} else if (resultData.bytediff) {
			newPart = html`<div class="result-graphic padding">${ICON_BYTES}
				<p>No pixels have changed, but the bytes are different.</p>
				<p class="details">
					Golden size: ${resultData.info.golden.byteSize} bytes<br />
					New size: ${resultData.info.new.byteSize} bytes
				</p>
			</div>`;
		} else {
			newPart = renderPart('new', resultData.info.new, overlay);
		}
		return html`
			<div class="result-split">
				${goldenPart}
				<div class="result-split-divider"></div>
				${newPart}
			</div>`;
	} else if (options.layout === LAYOUTS.FULL.value) {
		if (options.fullMode === FULL_MODE.GOLDEN.value) {
			return goldenPart;
		} else {
			return renderPart('new', resultData.info.new, overlay);
		}
	}

}

export function renderBrowserResults(browser, tests, options) {
	const results = tests.reduce((acc, t) => {

		const resultData = t.results.find(r => r.name === browser.name);
		if (resultData.passed && options.filterStatus === FILTER_STATUS.FAILED ||
			!resultData.passed && options.filterStatus === FILTER_STATUS.PASSED ||
			resultData.bytediff && options.filterHideByteDiff) {
			return acc;
		}

		let status = STATUS_TYPE.NORMAL;
		if (resultData.info) {
			status = STATUS_TYPE.WARNING;
			if (resultData.duration > resultData.info.slowDuration) {
				status = STATUS_TYPE.ERROR;
			} else if (resultData.duration < (resultData.info.slowDuration / 2)) {
				status = STATUS_TYPE.NORMAL;
			}
		}

		let pixelsDiff = nothing;
		if (resultData.info?.pixelsDiff > 0) {
			const pixelsStatus = (resultData.info?.pixelsDiff) < 10 ? STATUS_TYPE.WARNING : STATUS_TYPE.ERROR;
			pixelsDiff = html`
				<div class="result-pixels-diff">
					${renderStatusText(`${resultData.info.pixelsDiff.toLocaleString()}px`, pixelsStatus)}
				</div>
			`;
		}

		return acc.push(html`
			<div class="item-container">
				<div class="result-test-name">
					<h3>${t.name.split(' > ').flatMap(p => [html`<span class="breadcrumb-arrow"> ></span> `, p]).slice(1)}</h3>
					${pixelsDiff}
					<div class="result-duration">${renderStatusText(`${resultData.duration}ms`, status)}</div>
				</div>
				${renderResult(resultData, options)}
			</div>
		`) && acc;

	}, []);
	return html`
		${renderBrowserInfo(browser)}
		${results.length === 0 ? renderEmpty() : results}
	`;
}
