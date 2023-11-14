
import { defineCE, expect, fixture, html, waitUntil } from '../../src/browser/index.js';
import { restore, stub } from 'sinon';
import { focusElem } from '../../src/browser/commands.js';
import { LitElement } from 'lit';
import { requestMouseReset } from '../../src/browser/reset.js';
import { sendMouse } from '@web/test-runner-commands';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

const resolves = new Map();

const slowElem = defineCE(
	class extends LitElement {
		constructor() {
			super();
			this.finished = false;
			this.promise = new Promise((resolve) => resolves.set(this.id, resolve));
			this.promise.then(() => this.finished = true);
		}
		render() {
			return html`<slot></slot>`;
		}
		async getUpdateComplete() {
			await super.getUpdateComplete;
			return this.promise;
		}
	}
);

const asyncElem = defineCE(
	class extends LitElement {
		constructor() {
			super();
			this.finished = false;
			this.promise = new Promise(resolve => resolves.set(this.id, resolve));
			this.promise.then(() => this.finished = true);
		}
		render() {
			return html`<slot></slot>`;
		}
		async getLoadingComplete() {
			return this.promise;
		}
	}
);

const nestedElem = defineCE(
	class extends LitElement {
		render() {
			return unsafeHTML(`<${slowElem} id="slow"></${slowElem}><${asyncElem} id="async"></${asyncElem}>`);
		}
	}
);

const removedElem = defineCE(
	class extends LitElement {
		render() {
			return html`<p>Still here</p>`;
		}
		async getLoadingComplete() {
			setTimeout(() => this.remove());
			return new Promise(() => {});
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

		it('will not reset mouse position by default', async() => {
			const elem = html`<p>hello</p>`;
			await fixture(elem);
			await sendMouse({ type: 'move', position: [5, 10] });
			expect(mousePos.x).to.equal(5);
			expect(mousePos.y).to.equal(10);
			await fixture(elem);
			expect(mousePos.x).to.equal(5);
			expect(mousePos.y).to.equal(10);
		});

		it('should reset mouse position if requested', async() => {
			const elem = html`<p>hello</p>`;
			await fixture(elem);
			await sendMouse({ type: 'move', position: [5, 10] });
			requestMouseReset();
			expect(mousePos.x).to.equal(5);
			expect(mousePos.y).to.equal(10);
			await fixture(elem);
			expect(mousePos.x).to.equal(0);
			expect(mousePos.y).to.equal(0);
		});

		it('should reset focus', async() => {
			const elem = await fixture(html`<button>hello</button>`);
			expect(document.activeElement).to.equal(document.body);
			await focusElem(elem);
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

		it('should use specified mathjax latex config', async() => {
			await fixture(html`<p>hello</p>`, { mathjax: { renderLatex: true } });
			const config = JSON.parse(document.documentElement.dataset.mathjaxContext);
			expect(config.renderLatex).to.be.true;
		});

		it('should reset mathjax latex config', async() => {
			await fixture(html`<p>hello</p>`, { mathjax: { renderLatex: true } });
			await fixture(html`<p>hello</p>`);
			expect(document.documentElement.hasAttribute('data-mathjax-context')).to.be.false;
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

		const timeouts = [];
		afterEach(() => {
			resolves.clear();
			while (timeouts.length > 0) {
				clearTimeout(timeouts.shift()); // otherwise if tests ever fail, code in the timeouts can execute during the next test
			}
		});

		it('should wait for slow element at fixture root', async() => {
			const finishedPromise = fixture(`<${slowElem} id="slow"></${slowElem}>`)
				.then((elem) => elem.finished);
			await waitUntil(() => resolves.has('slow'));
			timeouts.push(setTimeout(() => resolves.get('slow')(), 50));
			const finished = await finishedPromise;
			expect(finished).to.be.true;
		});

		it('should wait for async element at fixture root', async() => {
			const finishedPromise = fixture(`<${asyncElem} id="async"></${asyncElem}>`)
				.then((elem) => elem.finished);
			await waitUntil(() => resolves.has('async'));
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			const finished = await finishedPromise;
			expect(finished).to.be.true;
		});

		it('should not wait for async element if requested', async() => {
			const finishedPromise = fixture(`<${asyncElem} id="async"></${asyncElem}>`, { awaitLoadingComplete: false })
				.then((elem) => elem.finished);
			await waitUntil(() => resolves.has('async'));
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			const finished = await finishedPromise;
			expect(finished).to.be.false;
		});

		it('should wait for slow/async elements inside native element', async() => {
			const finishedPromise = fixture(`
				<div>
					<${slowElem} id="slow1"></${slowElem}>
					<${asyncElem} id="async"></${asyncElem}>
					<${slowElem} id="slow2"></${slowElem}>
				</div>
			`).then((elem) => [...elem.querySelectorAll(`${slowElem}, ${asyncElem}`)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 3);
			timeouts.push(setTimeout(() => resolves.get('slow1')(), 40));
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			timeouts.push(setTimeout(() => resolves.get('slow2')(), 40));
			const finished = await finishedPromise;
			expect(finished.length).to.equal(3);
		});

		it('should wait for slow/async elements nested in light DOM', async() => {
			const finishedPromise = fixture(`
				<div>
					<${slowElem} id="slow1"></${slowElem}>
					<div>
						<${asyncElem} id="async"></${asyncElem}>
						<div>
							<${slowElem} id="slow2"></${slowElem}>
						</div>
					</div>
				</div>
			`).then((elem) => [...elem.querySelectorAll(`${slowElem}, ${asyncElem}`)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 3);
			timeouts.push(setTimeout(() => resolves.get('slow1')(), 40));
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			timeouts.push(setTimeout(() => resolves.get('slow2')(), 40));
			const finished = await finishedPromise;
			expect(finished.length).to.equal(3);
		});

		it('should wait for slow element nested in async element', async() => {
			const finishedPromise = fixture(`
				<${asyncElem} id="async">
					<${slowElem} id="slow"></${slowElem}>
				</${asyncElem}>
			`).then((elem) => [elem, elem.querySelector(slowElem)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 2);
			timeouts.push(setTimeout(() => resolves.get('slow')(), 40));
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			const finished = await finishedPromise;
			expect(finished.length).to.equal(2);
		});

		it('should wait for async element nested in slow element', async() => {
			const finishedPromise = fixture(`
				<${slowElem} id="slow">
					<${asyncElem} id="async"></${asyncElem}>
				</${slowElem}>
			`).then((elem) => [elem, elem.querySelector(asyncElem)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 2);
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			timeouts.push(setTimeout(() => resolves.get('slow')(), 40));
			const finished = await finishedPromise;
			expect(finished.length).to.equal(2);
		});

		it('should wait for slow/async elements nested in shadow DOM', async() => {
			const finishedPromise = fixture(`<${nestedElem}></${nestedElem}>`)
				.then((elem) => [...elem.shadowRoot.querySelectorAll(`${slowElem}, ${asyncElem}`)].filter(e => e.finished));
			await waitUntil(() => resolves.size === 2);
			timeouts.push(setTimeout(() => resolves.get('async')(), 50));
			timeouts.push(setTimeout(() => resolves.get('slow')(), 40));
			const finished = await finishedPromise;
			expect(finished.length).to.equal(2);
		});

		it('should abort waiting if elements are removed before getLoadingComplete', async() => {
			const elem = await fixture(`<div><${removedElem}></${removedElem}></div>`);
			expect(elem.querySelector(removedElem)).to.be.null;
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
