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
	const inputTemplate = html`<input type="text">`;

	let elem;
	const clickPos = { x: 0, y: 0 };
	const mousePos = { x: 0, y: 0 };

	function onClick(e) {
		clickPos.x = e.clientX;
		clickPos.y = e.clientY;
	}

	function onMouseMove(e) {
		mousePos.x = e.clientX;
		mousePos.y = e.clientY;
	}

	describe('click/hover', () => {
		before(() => {
			window.addEventListener('click', onClick);
			window.addEventListener('mousemove', onMouseMove);
		});

		beforeEach(async() => {
			elem = await fixture(buttonTemplate);
		});

		after(() => {
			window.removeEventListener('click', onClick);
			window.removeEventListener('mousemove', onMouseMove);
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
			elem.addEventListener('mouseover', () => hovered = true);
			elem.addEventListener('mouseout', () => hovered = false);
			await hoverElem(elem);
			expect(hovered).to.be.true;
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
		beforeEach(async() => {
			elem = await fixture(inputTemplate);
		});

		it('should focus on element', async() => {
			let focused = false;
			elem.addEventListener('focus', () => focused = true);
			await focusElem(elem);
			expect(focused).to.be.true;
		});

		it('should send keys to element', async() => {
			await sendKeysElem(elem, 'type', 'Hello');
			expect(elem.value).to.equal('Hello');
		});

		it('should send keys to browser', async() => {
			let key = undefined;
			function onKeyDown(e) {
				key = e.key;
			}
			window.addEventListener('keydown', onKeyDown);
			await sendKeys('press', 'Escape');
			expect(key).to.equal('Escape');
			window.removeEventListener('keydown', onKeyDown);
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
		before(() => {
			window.addEventListener('mousemove', onMouseMove);
		});

		beforeEach(async() => {
			elem = await fixture(buttonTemplate);
		});

		after(() => {
			window.removeEventListener('mousemove', onMouseMove);
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
