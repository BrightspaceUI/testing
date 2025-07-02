/* eslint-disable no-invalid-this */

import { css, html, nothing } from 'lit';
import { FILTER_STATUS, FULL_MODE, LAYOUTS, renderEmpty, renderStatusText, STATUS_TYPE } from './common.js';
import { ICON_BROWSERS, ICON_BYTES, ICON_NO_GOLDEN, ICON_TADA } from './icons.js';
import data from './data.js';

function handleImageLoad(e) {
	// the natural width must be divided by the devicePixelRatio of the capturing device
	const actualWidth =`${e.target.naturalWidth / 2}px`;
	e.target.style.width = actualWidth;
	const splitElem = e.composedPath().find(el => el.classList.contains('result-split'));
	const graphic = splitElem.querySelector('.result-graphic');
	if (graphic) graphic.style.maxWidth = `${actualWidth}px`;
	this.updateElemSticky(splitElem);
}

export const RESULT_STYLE = css`
	.result-browser {
		align-items: center;
		border-bottom: 4px solid #e3e9f1;
		display: flex;
		gap: 10px;
		left: 0;
		position: sticky;
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
		border-bottom: 4px solid #e3e9f1;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: center;
		min-width: max-content;
	}

	:host([fit]) {
		min-width: unset;
	}

	.result-split > div:nth-child(odd) {
		box-sizing: border-box;
		min-width: fit-content;
		width: 50%;
	}
	.result-split-divider {
		border-right: 2px solid #007bff;
		flex: 0 0 auto;
	}
	.result-part {
		display: inline-block;
	}
	.item-container > .result-part {
		border-bottom: 4px solid #e3e9f1;
		min-width: fit-content;
		text-align: center;
		width: 100%;
	}
	.result-diff-container img {
		cursor: zoom-in;
		image-rendering: pixelated;
	}
	.result-diff-container:has(> img:not([style])) {
		height: 0;
		width: 0;
	}
	.result-diff-container {
		background: repeating-conic-gradient(#cdd5dc 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
		background-clip: content-box;
		background-position: 0 0;
		border: 2px dashed #90989d;
		display: inline-block;
		line-height: 0;
		margin: 30px;
		position: relative;
	}
	.result-split > .result-part:first-of-type > .result-part-wrapper {
		text-align: right;
	}
	.result-split > .result-part:last-of-type > .result-part-wrapper {
		text-align: left;
	}
	.result-split > :first-of-type .result-graphic {
		justify-self: right;
	}
	.result-split > :last-of-type .result-graphic {
		justify-self: left;
	}
	.result-overlay {
		background: hsla(0, 0%, 100%, 0.8);
		left: 0;
		position: absolute;
		top: 0;
	}
	.result-overlay img {
		max-width: 100%;
	}
	#viewer .result-diff-container > img {
		cursor: auto;
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
		background-color: #eeeeee;
		border-bottom: 1px solid #cccccc;
		display: flex;
		gap: 5px;
		justify-content: center;
		padding: 5px;
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
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 20px;
		height: calc(100% - 30px);
		justify-content: center;
		max-height: 300px;
		max-width: 500px;
		min-width: 250px;
		padding: 40px 30px 30px;
		width: 100%;
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
		flex-wrap: wrap;
		gap: 10px;
		left: 0;
		padding: 50px 20px 30px;
		position: sticky;
	}
	.result-test-name > h3 {
		flex-grow: 1;
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
					<div class="result-part-info-name">${label}</div>
					<div class="result-part-info-size">(${partInfo.width} x ${partInfo.height})</div>
				</div>
				<div class="result-part-wrapper">
					<div class="result-diff-container" @mouseup="${this._handleDiffContainerMouseUp}" @mousedown="${this._handleDiffContainerMouseDown}" @click="${this._handleDiffContainerClick}"><img src="../${partInfo.path}" loading="lazy" alt="" @load="${handleImageLoad}">${overlay}</div>
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
		html`<div>
			<div class="result-part-info">&nbsp;</div>
			<div class="result-graphic padding">
				${ICON_NO_GOLDEN}
				<p>No golden exists for this test... yet.</p>
			</div>
		</div>` :
		renderPart('golden', resultData.info.golden, options.layout === LAYOUTS.SPLIT.value ? undefined : overlay);

	if (options.layout === LAYOUTS.SPLIT.value) {
		let newPart;
		if (resultData.passed) {
			newPart = html`<div>
				<div class="result-part-info">&nbsp;</div>
				<div class="result-graphic padding">
					${ICON_TADA}
					<p>Hooray! No changes here.</p>
				</div>
			</div>`;
		} else if (resultData.bytediff) {
			newPart = html`<div>
				<div class="result-part-info">&nbsp;</div>
				<div class="result-graphic padding">${ICON_BYTES}
					<p>No pixels have changed, but the bytes are different.</p>
					<p class="details">
						Golden size: ${resultData.info.golden.byteSize} bytes<br />
						New size: ${resultData.info.new.byteSize} bytes
					</p>
				</div>
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
				${renderResult.call(this, resultData, options)}
			</div>
		`) && acc;

	}, []);
	return html`
		${renderBrowserInfo(browser)}
		${results.length === 0 ? renderEmpty() : results}
	`;
}
