export const ALT_TESTS = {
	dark: {
		set() {
			document.documentElement.setAttribute('data-color-mode', 'dark');
		},
		reset() {
			document.documentElement.removeAttribute('data-color-mode');
		}
	}
};

export const allColorModes = ['dark'];
