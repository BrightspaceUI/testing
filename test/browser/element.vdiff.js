import { css, html, LitElement, nothing } from 'lit';
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
			return html`<span>${this.text}</span><b>Testing</b>`;
		}
	}
);

const absoluteElementTag = defineCE(
	class extends LitElement {
		static get styles() {
			return css`
				div {
					border: 1px solid blue;
					position: absolute;
					bottom: 250px;
				}
			`;
		}
		render() {
			return html`
				<div class="vdiff-target">Absolutely Positioned</div>
			`;
		}
	}
);

const fixedElementTag = defineCE(
	class extends LitElement {
		static get properties() {
			return { multipleTargets: { type: Boolean, attribute: 'multiple-targets' } };
		}
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
				${this.multipleTargets ? unsafeHTML(`
					<${absoluteElementTag} class="vdiff-target"></${absoluteElementTag}>
				`) : nothing}
			`;
		}
	}
);

const nestedElementTag = defineCE(
	class extends LitElement {
		render() {
			return html`${unsafeHTML(`
				<${fixedElementTag} class="vdiff-target"><${elementTag} text="Visual Difference"></${elementTag}></${fixedElementTag}>
				<slot></slot>
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
			const elem = await fixture(`<${elementTag} text="Visual Difference"></${elementTag}>`, { rtl });
			if (action) await action(elem);
			await expect(elem).to.be.golden();
		});
	});

	it('full page', async() => {
		await fixture(`<${elementTag} text="Visual Difference"></${elementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(document).to.be.golden();
	});

	it('full page no padding', async() => {
		await fixture(`<${elementTag} style="margin: 0;" text="Visual Difference"></${elementTag}>`, { pagePadding: false, viewport: { width: 500, height: 500 } });
		await expect(document).to.be.golden();
	});

	it('page no padding', async() => {
		const elem = await fixture(`<${elementTag} style="margin: 0;" text="Visual Difference"></${elementTag}>`, { pagePadding: false, viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});

	it('true size', async() => {
		const elem = await fixture(`<${fixedElementTag}><${elementTag} text="Visual Difference"></${elementTag}></${fixedElementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});

	it('nested true size', async() => {
		const elem = await fixture(`<${nestedElementTag}></${nestedElementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});

	it('multiple targets', async() => {
		const elem = await fixture(`<${fixedElementTag} multiple-targets><${elementTag} text="Visual Difference"></${fixedElementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});

	it('multiple to include', async() => {
		const elem = await fixture(`<${nestedElementTag}><${absoluteElementTag} class="vdiff-include"></${absoluteElementTag}></${nestedElementTag}>`, { viewport: { width: 500, height: 500 } });
		await expect(elem).to.be.golden();
	});

	[
		{ name: 'overflow' },
		{ name: 'overflow-rtl', rtl: true },
		{ name: 'scrolled', action: elem => elem.shadowRoot.querySelector('span').scrollIntoView() },
		{ name: 'scrolled-rtl', rtl: true, action: elem => elem.shadowRoot.querySelector('span').scrollIntoView() }
	].forEach(({ name, rtl, action }) => {
		it(name, async() => {
			const elem = await fixture(`<${elementTag} style="margin: 0 0 500px; text-align: end;" text="Scrolled"></${elementTag}>`,
				{ rtl: rtl, viewport: { width: 270, height: 400 } }
			);
			if (action) await action(elem);
			await expect(elem).to.be.golden();
		});
	});

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

});

describe('element-different', () => {
	let isGolden;
	before(async() => {
		isGolden = true;//await executeServerCommand('vdiff-get-golden-flag');
	});

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

	it('byte size', async() => {
		const elem = await fixture(`<${elementTag} text="Visual Difference"></${elementTag}>`);
		let fail = false;
		try {
			await expect(elem).to.be.golden();
		} catch (ex) {
			fail = true;
		}

		if (!isGolden) {
			expect(fail, 'current and golden images to have different byte size').equal(true);
		} else {
			// Modify golden file to be different byte size than what the test will generate
			await executeServerCommand('vdiff-modify-golden-file', { testCategory: 'element-different', fileName: 'byte-size.png' });
		}
	});
});
