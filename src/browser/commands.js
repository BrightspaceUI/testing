import { sendKeys as cmdSendKeys, sendMouse } from '@web/test-runner-commands';

function getElementPosition(elem) {
	const { x, y, width, height } = elem.getBoundingClientRect();
	return [
		Math.floor(x + window.scrollX + width / 2),
		Math.floor(y + window.scrollY + height / 2),
	];
}

export async function clickAt(x, y) {
	await sendMouse({ type: 'click', position: [x, y] });
}

export async function clickElem(elem) {
	const position = getElementPosition(elem);
	return clickAt(position[0], position[1]);
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
	return hoverAt(position[0], position[1]);
}

export async function sendKeys(action, keys) {
	const val = {};
	val[action] = keys;
	await cmdSendKeys(val);
}

export async function sendKeysElem(action, keys, elem) {
	if (elem) {
		await focusElem(elem);
	}
	return sendKeys(action, keys);
}
