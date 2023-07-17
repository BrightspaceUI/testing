import { css, html, nothing } from 'lit';
import { FULL_MODE, LAYOUTS } from './common.js';
import { ICON_TADA } from './icons.js';

export const RESULT_STYLE = css`
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
`;

export function renderResult(resultData, options) {

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
