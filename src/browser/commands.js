import { sendKeys as cmdSendKeys, sendMouse as cmdSendMouse } from '@web/test-runner-commands';
import { requestMouseReset } from './reset.js';
export { setViewport } from './reset.js';

function getElementPosition(elem) {
	const { x, y, width, height } = elem.getBoundingClientRect();
	return {
		left: Math.floor(x + window.scrollX),
		top: Math.floor(y + window.scrollY),
		x: Math.floor(x + window.scrollX + width / 2),
		y: Math.floor(y + window.scrollY + height / 2),
	};
}

async function sendMouse(options) {
	await cmdSendMouse(options);
	requestMouseReset();
}

export async function clickAt(x, y) {
	await sendMouse({ type: 'click', position: [x, y] });
}

export async function clickElem(elem) {
	const position = getElementPosition(elem);
	return clickAt(position.x, position.y);
}

export async function clickElemAt(elem, offsetX = 0, offsetY = 0) {
	const position = getElementPosition(elem);
	return clickAt(Math.floor(position.left + offsetX), Math.floor(position.top + offsetY));
}

export async function dragDropElems(elem, toElem) {
	const fromPosition = getElementPosition(elem);
	const toPosition = getElementPosition(toElem);
	await sendMouse({ type: 'move', position: [fromPosition.x, fromPosition.y] });
	await sendMouse({ type: 'down' });
	await sendMouse({ type: 'move', position: [toPosition.x, toPosition.y] });
	await sendMouse({ type: 'up' });
}

export async function focusElem(elem) {
	await cmdSendKeys({ press: 'Shift' }); // Tab moves focus, Escape causes dismissible things to close
	elem.focus({ focusVisible: true });
}

export async function hoverAt(x, y) {
	await sendMouse({ type: 'move', position: [x, y] });
	if (window.d2lTest) window.d2lTest.hovering = true;
}

export async function hoverElem(elem) {
	const position = getElementPosition(elem);
	return hoverAt(position.x, position.y);
}

export async function hoverElemAt(elem, offsetX = 0, offsetY = 0) {
	const position = getElementPosition(elem);
	return hoverAt(Math.floor(position.left + offsetX), Math.floor(position.top + offsetY));
}

export async function sendKeys(action, keys) {
	const val = {};
	val[action] = keys;
	await cmdSendKeys(val);
}

export async function sendKeysElem(elem, action, keys) {
	if (elem) {
		await focusElem(elem);
	}
	await new Promise(r => setTimeout(r));
	return sendKeys(action, keys);
}
