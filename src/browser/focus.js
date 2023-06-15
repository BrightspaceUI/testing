import { sendKeys, sendMouse } from '@web/test-runner-commands';

export async function focusWithKeyboard(element) {
	await sendKeys({ press: 'Shift' }); // Tab moves focus, Escape causes dismissible things to close
	element.focus({ focusVisible: true });
}

export async function focusWithMouse(element) {
	const { x, y } = element.getBoundingClientRect();
	await sendMouse({ type: 'click', position: [Math.ceil(x), Math.ceil(y)] });
	await sendMouse({ type: 'move', position: [0, 0] });
}
