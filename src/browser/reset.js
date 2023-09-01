import { sendMouse, setViewport } from '@web/test-runner-commands';
import { nextFrame } from '@open-wc/testing';

const DEFAULT_LANG = 'en',
	DEFAULT_MATHJAX_RENDER_LATEX = false,
	DEFAULT_VIEWPORT_HEIGHT = 800,
	DEFAULT_VIEWPORT_WIDTH = 800;

let
	currentMathjaxRenderLatex = DEFAULT_MATHJAX_RENDER_LATEX,
	currentRtl = false,
	currentViewportHeight = 0,
	currentViewportWidth = 0,
	shouldResetMouse = false;

export function requestMouseReset() {
	shouldResetMouse = true;
}

export async function reset(opts = {}) {

	const defaultOpts = {
		lang: DEFAULT_LANG,
		mathjax: {},
		rtl: !!opts.lang?.startsWith('ar'),
		viewport: {
			height: DEFAULT_VIEWPORT_HEIGHT,
			width: DEFAULT_VIEWPORT_WIDTH
		}
	};

	opts = { ...defaultOpts, ...opts };
	opts.viewport = { ...defaultOpts.viewport, ...opts.viewport };
	opts.mathjax.renderLatex = (typeof opts.mathjax.renderLatex === 'boolean') ? opts.mathjax.renderLatex : DEFAULT_MATHJAX_RENDER_LATEX;

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

	if (document.documentElement.lang !== opts.lang) {
		document.documentElement.lang = opts.lang;
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
