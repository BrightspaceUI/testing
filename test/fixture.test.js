
import { defineCE, expect, waitUntil } from '@open-wc/testing';
import { html, LitElement, nothing } from 'lit';
import { restore, stub } from 'sinon';
import { fixture } from '../src/index.js';
import { focusWithKeyboard } from '../src/focus.js';
import { sendMouse } from '@web/test-runner-commands';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

const resolves = new Map();

const slowElem = defineCE(
	class extends LitElement {
		static get properties() {
			return { nested: { type: Boolean } };
		}
		constructor() {
			super();
			this.nested = false;
			this.finished = false;
			this.promise = new Promise((resolve) => resolves.set(this.id, resolve));
			this.promise.then(() => this.finished = true);
		}
		render() {
			return this.nested ? html`${unsafeHTML(`<${slowElem} id="nested"></${slowElem}>`)}` : nothing;
		}
		async getUpdateComplete() {
			await super.getUpdateComplete;
			return this.promise;
		}
	}
);

describe('fixture', () => {

	afterEach(() => restore());

	describe('reset', () => {

		const mousePos = { x: 0, y: 0 };
		function onMouseMove(e) {
			mousePos.x = e.clientX;
			mousePos.y = e.clientY;
		}

		beforeEach(() => {
			window.addEventListener('mousemove', onMouseMove);
		});

		afterEach(() => {
			window.removeEventListener('mousemove', onMouseMove);
		});

		it('should reset window scroll position', async() => {
			const elem = html`<div style="height: 2000px; width: 2000px;">big thing</div>`;
			await fixture(elem);
			window.scrollTo(200, 300);
			expect(window.scrollX).to.equal(200);
			expect(window.scrollY).to.equal(300);
			await fixture(elem);
			expect(window.scrollX).to.equal(0);
			expect(window.scrollY).to.equal(0);
		});

		it('should reset mouse position', async() => {
			const elem = html`<p>hello</p>`;
			await fixture(elem);
			await sendMouse({ type: 'move', position: [5, 10] });
			expect(mousePos.x).to.equal(5);
			expect(mousePos.y).to.equal(10);
			await fixture(elem);
			expect(mousePos.x).to.equal(0);
			expect(mousePos.y).to.equal(0);
		});

		it('should reset focus', async() => {
			const elem = await fixture(html`<button>hello</button>`);
			expect(document.activeElement).to.equal(document.body);
			await focusWithKeyboard(elem);
			expect(document.activeElement).to.equal(elem);
			await fixture(html`<div>hello</div>`);
			expect(document.activeElement).to.equal(document.body);
		});

		it('should reset text direction', async() => {
			await fixture(html`<p>hello</p>`);
			expect(document.documentElement.hasAttribute('dir')).to.be.false;
			await fixture(html`<p>mrhban</p>`, { rtl: true });
			expect(document.documentElement.getAttribute('dir')).to.equal('rtl');
			await fixture(html`<p>hello</p>`);
			expect(document.documentElement.hasAttribute('dir')).to.be.false;
		});

		it('should use RTL text direction with AR language', async() => {
			await fixture(html`<p>mrhban</p>`, { lang: 'ar' });
			expect(document.documentElement.getAttribute('dir')).to.equal('rtl');
		});

		it('should default language to EN', async() => {
			await fixture(html`<p>hello</p>`);
			expect(document.documentElement.getAttribute('lang')).to.equal('en');
		});

		it('should reset language to EN', async() => {
			await fixture(html`<p>bonjour</p>`, { lang: 'fr' });
			expect(document.documentElement.getAttribute('lang')).to.equal('fr');
			await fixture(html`<p>hello</p>`);
			expect(document.documentElement.getAttribute('lang')).to.equal('en');
		});

		it('should default viewport size to 800x800', async() => {
			await fixture(html`<p>hello</p>`);
			expect(window.innerHeight).to.equal(800);
			expect(window.innerWidth).to.equal(800);
		});

		it('should reset viewport size', async() => {
			const elem = html`<p>hello</p>`;
			await fixture(elem, { viewport: { height: 200, width: 300 } });
			expect(window.innerHeight).to.equal(200);
			expect(window.innerWidth).to.equal(300);
			await fixture(elem);
			expect(window.innerHeight).to.equal(800);
			expect(window.innerWidth).to.equal(800);
		});

	});

	describe('waitForElem', () => {

		afterEach(() => {
			resolves.clear();
		});

		it('should wait for element at fixture root', async() => {
			const finishedPromise = fixture(`<${slowElem} id="elem1"></${slowElem}>`)
				.then((elem) => elem.finished);
			await waitUntil(() => resolves.has('elem1'));
			const timeout = setTimeout(() => resolves.get('elem1')(), 50);
			const finished = await finishedPromise;
			clearTimeout(timeout);
			expect(finished).to.be.true;
		});

		it('should wait for elements inside native element', async() => {
			const finishedPromise = fixture(`
				<div>
					<${slowElem} id="elem1"></${slowElem}>
					<${slowElem} id="elem2"></${slowElem}>
					<${slowElem} id="elem3"></${slowElem}>
				</div>
			`).then((elem) => [...elem.querySelectorAll(slowElem)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 3);
			const timeout1 = setTimeout(() => resolves.get('elem1')(), 50);
			const timeout2 = setTimeout(() => resolves.get('elem2')(), 50);
			const timeout3 = setTimeout(() => resolves.get('elem3')(), 50);
			const finished = await finishedPromise;
			clearTimeout(timeout1);
			clearTimeout(timeout2);
			clearTimeout(timeout3);
			expect(finished.length).to.equal(3);
		});

		it('should wait for elements nested in light DOM', async() => {
			const finishedPromise = fixture(`
				<div>
					<${slowElem} id="elem1"></${slowElem}>
					<div>
						<${slowElem} id="elem2"></${slowElem}>
						<div>
							<${slowElem} id="elem3"></${slowElem}>
						</div>
					</div>
				</div>
			`).then((elem) => [...elem.querySelectorAll(slowElem)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 3);
			const timeout1 = setTimeout(() => resolves.get('elem1')(), 50);
			const timeout2 = setTimeout(() => resolves.get('elem2')(), 50);
			const timeout3 = setTimeout(() => resolves.get('elem3')(), 50);
			const finished = await finishedPromise;
			clearTimeout(timeout1);
			clearTimeout(timeout2);
			clearTimeout(timeout3);
			expect(finished.length).to.equal(3);
		});

		it('should wait for elements nested in shadow DOM', async() => {
			const finishedPromise = fixture(`<${slowElem} id="parent" nested></${slowElem}>`)
				.then((elem) => [elem, elem.shadowRoot.querySelector('#nested')].filter(e => e.finished));
			await waitUntil(() => resolves.size === 2);
			resolves.get('parent')();
			const timeout = setTimeout(() => resolves.get('nested')(), 50);
			const finished = await finishedPromise;
			clearTimeout(timeout);
			expect(finished.length).to.equal(2);
		});

	});

	describe('waitForFonts', () => {

		let fontsLoaded, resolveFonts;

		beforeEach(() => {
			fontsLoaded = false;
			const readyPromise = new Promise((resolve) => resolveFonts = resolve);
			readyPromise.then(() => fontsLoaded = true);
			stub(document.fonts, 'ready').get(() => readyPromise);
		});

		it('should wait for fonts.ready Promise', async() => {
			const finishedPromise = fixture(html`<div></div>`);
			setTimeout(() => resolveFonts(), 50);
			await finishedPromise;
			expect(fontsLoaded).to.be.true;
		});

	});

});
