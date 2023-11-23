import { css, html, LitElement, nothing } from 'lit';
import { defineCE, expect, fixture } from '../../src/browser/index.js';

const mediaTag = defineCE(
	class extends LitElement {
		static get styles() {
			return css`
				:host {
					color: red;
				}
				@media print {
					:host {
						color: blue;
					}
				}
			`;
		}
		render() {
			return html`<p>I am red in screen media and blue in print media.</p>`;
		}
	}
);

describe('media', () => {

	it('nothing', async() => {
		const nothingTag = defineCE(
			class extends LitElement {
				render() {
					return nothing;
				}
			}
		);
		const elem = await fixture(`<${nothingTag}></${nothingTag}>`);
		await expect(elem).to.be.golden();
	});

	it('default', async() => {
		const elem = await fixture(`<${mediaTag}></${mediaTag}>`);
		await expect(elem).to.be.golden();
	});

	['screen', 'print'].forEach(media => {
		it(media, async() => {
			const elem = await fixture(`<${mediaTag}></${mediaTag}>`, { media });
			await expect(elem).to.be.golden();
		});
	});

});
