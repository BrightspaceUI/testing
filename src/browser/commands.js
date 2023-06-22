import { sendKeys as cmdSendKeys, sendMouse } from '@web/test-runner-commands';

function getElementPosition(elem) {
	const { x, y, width, height } = elem.getBoundingClientRect();
	return {
		x: Math.floor(x + window.scrollX + width / 2),
		y: Math.floor(y + window.scrollY + height / 2),
	};
}

export async function clickAt(x, y) {
	await sendMouse({ type: 'click', position: [x, y] });
}

export async function clickElem(elem) {
	const position = getElementPosition(elem);
	return clickAt(position.x, position.y);
}

export async function focusElem(elem) {
	await cmdSendKeys({ press: 'Shift' }); // Tab moves focus, Escape causes dismissible things to close
	elem.focus({ focusVisible: true });
}

export async function hoverAt(x, y) {
	await sendMouse({ type: 'move', position: [x, y] });
}

export async function hoverElem(elem) {
	const position = getElementPosition(elem);
	return hoverAt(position.x, position.y);
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
	return sendKeys(action, keys);
}
