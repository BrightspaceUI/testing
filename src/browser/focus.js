import { sendKeys } from '@web/test-runner-commands';

export const focusWithKeyboard = async(element) => {
	await sendKeys({ press: 'Escape' });
	element.focus({ focusVisible: true });
};
