import { sendMouse, setViewport } from '@web/test-runner-commands';
import { nextFrame } from '@open-wc/testing';

const DEFAULT_LANG = 'en',
	DEFAULT_VIEWPORT_HEIGHT = 800,
	DEFAULT_VIEWPORT_WIDTH = 800;

let currentLang = undefined,
	currentRtl = false,
	currentViewportHeight = 0,
	currentViewportWidth = 0;

export async function reset(opts) {

	opts = opts || {};
	opts.lang = opts.lang || DEFAULT_LANG;
	opts.rtl = opts.lang.startsWith('ar') || !!opts.rtl;
	opts.viewport = opts.viewport || {};
	opts.viewport.height = opts.viewport.height || DEFAULT_VIEWPORT_HEIGHT;
	opts.viewport.width = opts.viewport.width || DEFAULT_VIEWPORT_WIDTH;

	let awaitNextFrame = false;

	window.scroll(0, 0);

	await sendMouse({ type: 'move', position: [0, 0] }).catch(() => {});

	if (document.activeElement !== document.body) {
		document.activeElement.blur();
		awaitNextFrame = true;
	}

	if (opts.rtl !== currentRtl) {
		if (!opts.rtl) {
			document.documentElement.removeAttribute('dir');
		} else {
			document.documentElement.setAttribute('dir', 'rtl');
		}
		awaitNextFrame = true;
		currentRtl = opts.rtl;
	}

	if (opts.lang !== currentLang) {
		document.documentElement.setAttribute('lang', opts.lang);
		currentLang = opts.lang;
		awaitNextFrame = true;
	}

	if (opts.viewport.height !== currentViewportHeight || opts.viewport.width !== currentViewportWidth) {
		await setViewport(opts.viewport).catch(() => {});
		awaitNextFrame = true;
		currentViewportHeight = opts.viewport.height;
		currentViewportWidth = opts.viewport.width;
	}

	if (awaitNextFrame) {
		await nextFrame();
	}

}
