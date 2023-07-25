import { css, html, LitElement } from 'lit';

class Button extends LitElement {
	static properties = {
		disabled: { type: Boolean },
		text: { type: String }
	};
	static styles = [css`
		:host {
			display: inline-block;
		}
		button {
			align-items: center;
			border: 1px solid #cdd5dc;
			border-radius: 5px;
			cursor: pointer;
			display: flex;
			gap: 5px;
			line-height: 24px;
			margin: 0;
			outline: none;
			padding: 10px;
			user-select: none;
		}
		button,
		button[disabled]:hover {
			background-color: #ffffff;
			color: #6e7477;
		}
		button:hover,
		button:focus {
			background-color: #007bff;
			color: #ffffff;
		}
		button:focus-visible {
			border-color: #007bff;
			box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #007bff;
		}
		button[disabled] {
			cursor: default;
			opacity: 0.5;
		}
	`];
	constructor() {
		super();
		this.disabled = false;
	}
	render() {
		return html`<button ?disabled="${this.disabled}" type="button"><slot></slot>${this.text}</button>`;
	}
}

customElements.define('d2l-vdiff-report-button', Button);
