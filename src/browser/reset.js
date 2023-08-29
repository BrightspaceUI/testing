import { sendMouse, setViewport } from '@web/test-runner-commands';
import { nextFrame } from '@open-wc/testing';

const DEFAULT_LANG = 'en',
	DEFAULT_MATHJAX_RENDER_LATEX = false,
	DEFAULT_VIEWPORT_HEIGHT = 800,
	DEFAULT_VIEWPORT_WIDTH = 800;

let currentLang = undefined,
	currentMathjaxRenderLatex = DEFAULT_MATHJAX_RENDER_LATEX,
	currentRtl = false,
	currentViewportHeight = 0,
	currentViewportWidth = 0,
	shouldResetMouse = false;

export function requestMouseReset() {
	shouldResetMouse = true;
}

export async function reset(opts) {

	opts = opts || {};
	opts.lang = opts.lang ?? DEFAULT_LANG;
	opts.mathjax = opts.mathjax ?? {};
	opts.mathjax.renderLatex = (typeof opts.mathjax.renderLatex === 'boolean') ? opts.mathjax.renderLatex : DEFAULT_MATHJAX_RENDER_LATEX;
	opts.rtl = opts.lang.startsWith('ar') || !!opts.rtl;
	opts.viewport = opts.viewport ?? {};
	opts.viewport.height = opts.viewport.height ?? DEFAULT_VIEWPORT_HEIGHT;
	opts.viewport.width = opts.viewport.width ?? DEFAULT_VIEWPORT_WIDTH;

	let awaitNextFrame = false;

	window.scroll(0, 0);

	if (shouldResetMouse) {
		shouldResetMouse = false;
		await sendMouse({ type: 'move', position: [0, 0] }).catch(() => {});
	}

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

	if (opts.mathjax.renderLatex !== currentMathjaxRenderLatex) {
		currentMathjaxRenderLatex = opts.mathjax.renderLatex;
		if (opts.mathjax.renderLatex === DEFAULT_MATHJAX_RENDER_LATEX) {
			document.documentElement.removeAttribute('data-mathjax-context');
		} else {
			document.documentElement.dataset.mathjaxContext = JSON.stringify({
				renderLatex: opts.mathjax.renderLatex
			});
		}
	}

	if (awaitNextFrame) {
		await nextFrame();
	}

}
