import { css, html, LitElement } from 'lit';
import { defineCE, expect, fixture, hoverElem } from '../../src/browser/index.js';
import { executeServerCommand } from '@web/test-runner-commands';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

const elementTag = defineCE(
	class extends LitElement {
		static get properties() {
			return { text: { type: String } };
		}
		static get styles() {
			return css`
				:host {
					background-color: rgba(255,165,0,0.5);
					border: 1px solid orange;
					display: inline-block;
					height: 60px;
					margin: 10px;
					text-align: center;
					transition: opacity 2000ms ease-out;
					width: 300px;
				}
				:host(:hover) {
					background-color: rgba(255,165,225,0.5);
				}
				b {
					display: block;
					text-align: start;
				}
				@media (prefers-reduced-motion: reduce) {
					:host {
						transition: none;
					}
				}
			`;
		}
		render() {
			return html`${this.text}<b>Testing</b>`;
		}
	}
);

const fixedElementTag = defineCE(
	class extends LitElement {
		static get styles() {
			return css`
				div {
					background-color: white;
					border: 1px solid purple;
					border-radius: 8px;
					box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
					box-sizing: border-box;
					position: fixed;
				}
			`;
		}
		render() {
			return html`
				<div class="vdiff-target">
					<slot></slot>
				</div>
			`;
		}
	}
);

const nestedElementTag = defineCE(
	class extends LitElement {
		render() {
			return html`${unsafeHTML(`
				<${fixedElementTag} class="vdiff-target"><${elementTag} text="Visual Difference"></${elementTag}></${fixedElementTag}>
			`)}`;
		}
	}
);

describe('element-matches', () => {
	[
		{ name: 'default' },
		{ name: 'rtl', rtl: true },
		{ name: 'hover', action: async(elem) => await hoverElem(elem) },
		{ name: 'no-hover' }, // Test will fail if mouse reseting breaks
		{ name: 'transition', action: elem => elem.style.opacity = '0.2' }
	].forEach(({ name, rtl, action }) => {
		it(name, async() => {
			const elem = await fixture(`<${elementTag} text="Visual Difference"></${elementTag}>`, { rtl: rtl });
			if (action) await action(elem);
			await expect(elem).to.be.golden();
		});
	});

	it('full page', async() => {
		await fixture(`<${elementTag} text="Visual Difference"></${elementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(document).to.be.golden();
	});

	it('true size', async() => {
		const elem = await fixture(`<${fixedElementTag}><${elementTag} text="Visual Difference"></${elementTag}></${fixedElementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});

	it('nested true size', async() => {
		const elem = await fixture(`<${nestedElementTag}></${nestedElementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});
});

describe('element-different', () => {
	[
		{ name: 'default', action: elem => {
			elem.style.borderColor = 'black';
			elem.text = 'Different Text';
		} },
		{ name: 'smaller', action: elem => {
			elem.style.width = '200px';
			elem.style.height = '50px';
		} },
		{ name: 'larger', action: elem => {
			elem.style.width = '350px';
			elem.style.height = '70px';
		} },
		{ name: 'slimer-taller', action: elem => {
			elem.style.width = '200px';
			elem.style.height = '70px';
			elem.style.textAlign = 'end';
		} },
		{ name: 'wider-shorter', action: elem => {
			elem.style.width = '350px';
			elem.style.height = '50px';
			elem.style.textAlign = 'end';
		} }
	].forEach(({ name, action }) => {
		it(name, async() => {
			const elem = await fixture(`<${elementTag} text="Visual Difference"></${elementTag}>`);
			const isGolden = await executeServerCommand('vdiff-get-golden-flag');
			if (!isGolden) {
				await action(elem);
				await elem.updateComplete;
			}

			let fail = false;
			try {
				await expect(elem).to.be.golden();
			} catch (ex) {
				fail = true;
			}

			if (!isGolden) {
				expect(fail, 'current and golden images to be different').equal(true);
			}
		});
	});
});
