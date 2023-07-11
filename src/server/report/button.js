import { css, html, LitElement } from 'lit';

class Button extends LitElement {
	static properties = {
		text: { type: String }
	};
	static styles = [css`
		:host {
			display: inline-block;
		}
		button {
			align-items: center;
			background-color: #ffffff;
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
		button:hover,
		button:focus-visible {
			background-color: #007bff;
			color: #ffffff;
		}
		button:focus-visible {
			border-color: #007bff;
			box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #007bff;
		}
	`];
	render() {
		return html`<button type="button"><slot></slot>${this.text}</button>`;
	}
}

customElements.define('d2l-vdiff-report-button', Button);
