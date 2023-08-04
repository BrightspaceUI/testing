/* eslint no-console: 0 */

import { clickAt, clickElem, expect, fixture, focusElem, hoverAt, hoverElem, sendKeys, sendKeysElem } from '../../src/browser/index.js';
import { html } from 'lit';
import { spy } from 'sinon';

describe('commands', () => {

	let elem;
	const input = html`<input type="text">`;
	beforeEach(async() => {
		console.log('before fixture');
		elem = await fixture(input);
		console.log('after fixture');
	});

	it('should click on element', async() => {
		const clickSpy = spy();
		elem.addEventListener('click', clickSpy);
		await clickElem(elem);
		expect(clickSpy).to.be.calledOnce;
	});

	it('should click at position', async() => {
		const clickPos = { x: 0, y: 0 };
		function onClick(e) {
			clickPos.x = e.clientX;
			clickPos.y = e.clientY;
		}
		window.addEventListener('click', onClick);
		await clickAt(200, 300);
		expect(clickPos.x).to.equal(200);
		expect(clickPos.y).to.equal(300);
		window.removeEventListener('click', onClick);
	});

	it('should focus on element', async() => {
		let focussed = false;
		elem.addEventListener('focus', () => focussed = true);
		await focusElem(elem);
		expect(focussed).to.be.true;
	});

	it('should hover over element', async() => {
		let hovered = false;
		elem.addEventListener('mouseover', () => hovered = true);
		elem.addEventListener('mouseout', () => hovered = false);
		await hoverElem(elem);
		expect(hovered).to.be.true;
	});

	it('should hover at position', async() => {
		const mousePos = { x: 0, y: 0 };
		function onMouseMove(e) {
			mousePos.x = e.clientX;
			mousePos.y = e.clientY;
		}
		window.addEventListener('mousemove', onMouseMove);
		await hoverAt(50, 100);
		expect(mousePos.x).to.equal(50);
		expect(mousePos.y).to.equal(100);
		window.removeEventListener('mousemove', onMouseMove);
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

	describe('mouseReset', () => {
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

		[
			{ command: 'clickElem', action: (elem) => clickElem(elem) },
			{ command: 'clickAt', action: () => clickAt(5, 10) },
			{ command: 'hoverElem', action: (elem) => hoverElem(elem) },
			{ command: 'hoverAt', action: () => hoverAt(5, 10) },
		].forEach(({ command, action }) => {
			it(`should reset mouse position after ${command}`, async() => {
				await action(elem);
				expect(mousePos.x).to.not.equal(0);
				expect(mousePos.y).to.not.equal(0);
				await fixture(input);
				expect(mousePos.x).to.equal(0);
				expect(mousePos.y).to.equal(0);
			});
		});
	});

});
