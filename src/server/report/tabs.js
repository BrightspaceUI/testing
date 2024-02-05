import { css, html, nothing } from 'lit';

function onKeyDown(e) {
	let focusOn;
	switch (e.key) {
		case 'ArrowRight':
			focusOn = e.target.nextElementSibling || e.target.parentNode.firstElementChild;
			break;
		case 'ArrowLeft':
			focusOn = e.target.previousElementSibling || e.target.parentNode.lastElementChild;
			break;
		case 'Home':
			focusOn = e.target.parentNode.firstElementChild;
			break;
		case 'End':
			focusOn = e.target.parentNode.lastElementChild;
			break;
	}
	if (focusOn) focusOn.focus();
}

export const TAB_STYLE = css`
	[role="tablist"] {
		align-items: stretch;
		border-top: 1px solid #cdd5dc;
		display: flex;
		flex: 0 0 auto;
		flex-wrap: nowrap;
	}
	[role="tab"] {
		background: none;
		border: none;
		border-right: 1px solid #cdd5dc;
		cursor: pointer;
		flex: 1 0 auto;
		margin: 0;
		outline: none;
		padding: 10px 15px;
		position: relative;
		user-select: none;
	}
	[role="tab"]:last-child {
		border-right: none;
	}
	[role="tab"] > span {
		display: inline-block;
		padding: 5px;
	}
	[role="tab"]:focus-visible > span {
		border: 2px solid #007bff;
		border-radius: 3px;
		padding: 3px;
	}
	[role="tab"]:hover > span {
		color: #007bff;
	}
	.tab-selected-indicator {
		border-block-start: 4px solid #007bff;
		border-start-end-radius: 4px;
		border-start-start-radius: 4px;
		bottom: 0;
		position: absolute;
		width: calc(100% - 30px);
	}
`;

export function renderTabButtons(label, tabs, onTabClick) {

	const renderTabButton = (tab, index, onTabClick) => {
		const clickHandler = () => onTabClick(index);
		return html`
			<button
				aria-controls="tabpanel-${tab.id}"
				aria-selected="${tab.selected ? 'true' : 'false'}"
				id="tab-${tab.id}"
				role="tab"
				tabindex="${tab.selected ? '0' : '-1'}"
				type="button"
				@click="${clickHandler}">
					<span>${tab.label} ${tab.status}</span>${tab.selected ? html`
					<div class="tab-selected-indicator"></div>` : nothing}
			</button>`;
	};

	return html`
		<div role="tablist" aria-label="${label}" @keydown="${onKeyDown}">
			${tabs.map((tab, i) => renderTabButton(tab, i, onTabClick))}
		</div>
	`;

}

export function renderTabPanel(tab) {
	return html`
		<div id="tabpanel-${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}" ?hidden="${!tab.selected}">
			${tab.content}
		</div>
	`;
}
