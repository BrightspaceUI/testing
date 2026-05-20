import { html } from 'lit';
import { expect, fixture } from '../../src/browser/index.js';

describe('axe', () => {
	it('typography', async() =>{
		// If typography is set, font color should not match background color, so this should fail accessibility tests
		const el = await fixture(html`<div style="background-color: black">My content</div>`);
		await expect(el).to.not.be.accessible();
	});

	describe('color modes', () => {
		it('fails on light only', async() =>{
			const el = await fixture(html`<div style="background-color: black">My content</div>`);
			try {
				await expect(el).to.be.accessible({ allColorModes: true });
			} catch (e) {
				await expect(e.message).to.not.include('Color mode: Dark');
			}
		});

		it('fails on dark only', async() =>{
			const el = await fixture(html`<div style="background-color: white">My content</div>`);
			await expect(el).to.be.accessible();
			await expect(el).to.not.be.accessible({ allColorModes: true });
		});
	});


	it('fixed position outside body', async() => {
		const el = await fixture(html`<div style="position: fixed; top: 200px; width: 600px; height: 100px;">
			<p style="color:#AAA;">My content</p>
		</div>`);
		document.body.style.overflow = 'hidden';
		await expect(el).to.not.be.accessible();
	});


});
