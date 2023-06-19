import { sendKeys, sendMouse } from '@web/test-runner-commands';

function getElementPosition(elem) {
	const { x, y, width, height } = elem.getBoundingClientRect();
	return [
		Math.floor(x + window.scrollX + width / 2),
		Math.floor(y + window.scrollY + height / 2),
	];
}

export async function click(elem) {
	await sendMouse({ type: 'click', position: getElementPosition(elem) });
}

export async function clickAt(x, y) {
	await sendMouse({ type: 'click', position: [x, y] });
}

export async function focus(elem) {
	await sendKeys({ press: 'Shift' }); // Tab moves focus, Escape causes dismissible things to close
	elem.focus({ focusVisible: true });
}

export async function hover(elem) {
	await sendMouse({ type: 'move', position: getElementPosition(elem) });
}

export async function hoverAt(x, y) {
	await sendMouse({ type: 'move', position: [x, y] });
}

export async function keyboard(action, keys, elem) {
	if (elem) {
		await focus(elem);
	}
	const val = {};
	val[action] = keys;
	await sendKeys(val);
}
