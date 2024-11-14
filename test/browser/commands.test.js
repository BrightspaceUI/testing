import { clickAt, clickElem, clickElemAt, dragDropElems, expect, fixture, focusElem, hoverAt, hoverElem, hoverElemAt, sendKeys, sendKeysElem, setViewport } from '../../src/browser/index.js';
import { html } from 'lit';
import { spy } from 'sinon';

describe('commands', () => {
	const buttonTemplate = html`<button>text</button>`;
	const draggableTemplate = html`
		<div>
			<div id="dest" style="height: 100px; width: 100px;"></div>
			<div id="source" draggable="true" style="height: 50px; width: 50px;"></div>
		</div>`;
	const emptyDivTemplate = html`<div></div>`;
	const focusTemplate = html`
		<div>
			<input type="text">
			<button>text</button>
		</div>`;

	let elem, focusSource, key, keys;
	const clickPos = { x: 0, y: 0 };
	const mousePos = { x: 0, y: 0 };

	function onClick(e) {
		clickPos.x = e.clientX;
		clickPos.y = e.clientY;
	}

	function onKeyDown(e) {
		key = e.key;
		if (Array.isArray(keys)) {
			keys.push(key);
		};
	}

	function onFocus(e) {
		focusSource = e.target;
	}

	function onMouseMove(e) {
		mousePos.x = e.clientX;
		mousePos.y = e.clientY;
	}

	before(() => {
		window.addEventListener('click', onClick);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('mousemove', onMouseMove);
	});

	after(() => {
		window.removeEventListener('click', onClick);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('mousemove', onMouseMove);
	});

	describe('click/hover', () => {
		beforeEach(async() => {
			elem = await fixture(buttonTemplate);
		});

		it('should click on element', async() => {
			const clickSpy = spy();
			elem.addEventListener('click', clickSpy);
			await clickElem(elem);
			expect(clickSpy).to.be.calledOnce;
		});

		it('should click at position', async() => {
			await clickAt(200, 300);

			expect(clickPos.x).to.equal(200);
			expect(clickPos.y).to.equal(300);
		});

		it('should clickElemAt top-left by default', async() => {
			await clickElemAt(elem);

			const { x: expectedX, y: expectedY } = elem.getBoundingClientRect();

			expect(clickPos.x).to.equal(expectedX);
			expect(clickPos.y).to.equal(expectedY);
		});

		it('should clickElemAt offset from elem origin', async() => {
			await clickElemAt(elem, 10, 10);

			const { x, y } = elem.getBoundingClientRect();
			const expectedX = x + 10;
			const expectedY = y + 10;

			expect(clickPos.x).to.equal(expectedX);
			expect(clickPos.y).to.equal(expectedY);
		});

		it('should hover over element', async() => {
			let hovered = false;

			function onMouseOver() {
				hovered = true;
			}

			function onMouseOut() {
				hovered = false;
			}

			elem.addEventListener('mouseover', onMouseOver);
			elem.addEventListener('mouseout', onMouseOut);

			await hoverElem(elem);
			expect(hovered).to.be.true;

			elem.removeEventListener('mouseover', onMouseOver);
			elem.removeEventListener('mouseout', onMouseOut);
		});

		it('should hover at position', async() => {
			await hoverAt(50, 100);

			expect(mousePos.x).to.equal(50);
			expect(mousePos.y).to.equal(100);
		});

		it('should hoverElemAt top-left by default', async() => {
			await hoverElemAt(elem);

			const { x: expectedX, y: expectedY } = elem.getBoundingClientRect();

			expect(mousePos.x).to.equal(expectedX);
			expect(mousePos.y).to.equal(expectedY);
		});

		it('should hoverElemAt offset from elem origin', async() => {
			await hoverElemAt(elem, 10, 10);

			const { x, y } = elem.getBoundingClientRect();
			const expectedX = x + 10;
			const expectedY = y + 10;

			expect(mousePos.x).to.equal(expectedX);
			expect(mousePos.y).to.equal(expectedY);
		});
	});

	describe('keyboard/focus', async() => {
		let buttonElem, inputElem;

		beforeEach(async() => {
			elem = await fixture(focusTemplate).then(rootElem => {
				buttonElem = rootElem.querySelector('button');
				inputElem = rootElem.querySelector('input');
			});
			buttonElem.addEventListener('focus', onFocus);
			inputElem.addEventListener('focus', onFocus);
		});

		afterEach(() => {
			buttonElem.removeEventListener('focus', onFocus);
			inputElem.removeEventListener('focus', onFocus);
		});

		it('should focus on button then input element', async() => {
			await focusElem(buttonElem);
			expect(focusSource).to.equal(buttonElem);

			await focusElem(inputElem);
			expect(focusSource).to.equal(inputElem);
		});

		it('should move focus via key press', async() => {
			await sendKeysElem(elem, 'press', 'Tab');
			expect(focusSource).to.be(inputElem);
		});

		it('should send keys to element', async() => {
			key = undefined, keys = [];

			await sendKeysElem(inputElem, 'type', 'Hello');
			expect(inputElem.value).to.equal('Hello');
			expect(keys).to.include('Shift');
		});

		it('should send keys to browser', async() => {
			key = undefined;

			await sendKeys('press', 'Escape');
			expect(key).to.equal('Escape');
		});

	});

	describe('drag & drop', () => {

		it('should drag & drop element', (done) => {
			fixture(draggableTemplate).then(rootElem => {
				let dragSource;
				const sourceElem = rootElem.querySelector('#source');
				sourceElem.addEventListener('dragstart', e => dragSource = e.target);

				const destElem = rootElem.querySelector('#dest');
				destElem.addEventListener('dragover', e => e.preventDefault());
				destElem.addEventListener('drop', (e) => {
					e.preventDefault();
					expect(dragSource).to.equal(sourceElem);
					done();
				});

				dragDropElems(sourceElem, destElem);

			});
		});

	});

	describe('mouseReset', () => {
		beforeEach(async() => {
			elem = await fixture(buttonTemplate);
		});

		[
			{ command: 'clickElem', action: (elem) => clickElem(elem) },
			{ command: 'clickAt', action: () => clickAt(5, 10) },
			{ command: 'clickElemAt', action: (elem) => clickElemAt(elem, 10, 10) },
			{ command: 'hoverElem', action: (elem) => hoverElem(elem) },
			{ command: 'hoverAt', action: () => hoverAt(5, 10) },
			{ command: 'hoverElemAt', action: (elem) => hoverElemAt(elem, 10, 10) },
		].forEach(({ command, action }) => {
			it(`should reset mouse position after ${command}`, async() => {
				await action(elem);
				expect(mousePos.x).to.not.equal(0);
				expect(mousePos.y).to.not.equal(0);
				await fixture(buttonTemplate);
				expect(mousePos.x).to.equal(0);
				expect(mousePos.y).to.equal(0);
			});
		});
	});

	describe('viewport', () => {

		beforeEach(async() => {
			await fixture(emptyDivTemplate);
		});

		it('should set width and height', async() => {
			await setViewport({ height: 200, width: 300 });
			expect(window.innerHeight).to.equal(200);
			expect(window.innerWidth).to.equal(300);
		});

		it('should use default width and height', async() => {
			await setViewport({ height: 200, width: 300 });
			await setViewport();
			expect(window.innerHeight).to.equal(800);
			expect(window.innerWidth).to.equal(800);
		});

		it('should use default width', async() => {
			await setViewport({ height: 200, width: 300 });
			await setViewport({ height: 400 });
			expect(window.innerHeight).to.equal(400);
			expect(window.innerWidth).to.equal(800);
		});

		it('should use default height', async() => {
			await setViewport({ height: 200, width: 300 });
			await setViewport({ width: 400 });
			expect(window.innerHeight).to.equal(800);
			expect(window.innerWidth).to.equal(400);
		});

		it('should not call underlying API if values are unchanged', async() => {
			const size = { height: 200, width: 300 };
			const changed1 = await setViewport(size);
			expect(changed1).to.be.true;
			const changed2 = await setViewport(size);
			expect(changed2).to.be.false;
		});

	});

});
