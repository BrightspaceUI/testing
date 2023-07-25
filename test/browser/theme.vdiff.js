import { css, html, LitElement } from 'lit';
import { defineCE, expect, fixture } from '../../src/browser/index.js';

const themeTag = defineCE(
	class extends LitElement {
		static get properties() {
			return {
				theme: { reflect: true, type: String }
			};
		}
		static get styles() {
			return css`
				:host {
					border: 1px solid black;
					display: inline-block;
					text-align: center;
					padding: 20px;
				}
				:host([theme="dark"]) {
					border-color: white;
					color: white;
				}
			`;
		}
		render() {
			return html`Theme: ${this.theme}`;
		}
	}
);

describe('theme', () => {
	[
		'normal',
		'dark'
	].forEach(name => {
		it(name, async() => {
			const elem = await fixture(
				`<${themeTag} theme="${name}"></${themeTag}>`,
				{ theme: name === 'normal' ? undefined : name }
			);
			await expect(elem).to.be.golden();
		});
	});
});
