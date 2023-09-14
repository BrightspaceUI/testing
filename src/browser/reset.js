import { emulateMedia, sendMouse, setViewport } from '@web/test-runner-commands';
import { getDocumentLocaleSettings } from '@brightspace-ui/intl/lib/common.js';
import { nextFrame } from '@open-wc/testing';

const DEFAULT_FULLSCREEN = false,
	DEFAULT_LANG = 'en',
	DEFAULT_MATHJAX_RENDER_LATEX = false,
	DEFAULT_MEDIA = 'print',
	DEFAULT_VIEWPORT_HEIGHT = 800,
	DEFAULT_VIEWPORT_WIDTH = 800;

const documentLocaleSettings = getDocumentLocaleSettings();

let
	currentFullscreen = false,
	currentMathjaxRenderLatex = DEFAULT_MATHJAX_RENDER_LATEX,
	currentMedia = DEFAULT_MEDIA,
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
		},
		fullscreen: DEFAULT_FULLSCREEN
	};

	opts = { ...defaultOpts, ...opts };
	opts.viewport = { ...defaultOpts.viewport, ...opts.viewport };
	opts.mathjax.renderLatex = (typeof opts.mathjax.renderLatex === 'boolean') ? opts.mathjax.renderLatex : DEFAULT_MATHJAX_RENDER_LATEX;

	let awaitNextFrame = false;

	window.scroll(0, 0);

	if (opts.fullscreen !== currentFullscreen) {
		if (opts.fullscreen) {
			document.body.classList.add('fullscreen');
		}
		else {
			document.body.classList.remove('fullscreen');
		}
		awaitNextFrame = true;
		currentFullscreen = opts.fullscreen;
	}

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

	opts.lang ??= '';
	if (documentLocaleSettings.lamguage !== opts.lang) {
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

	if (opts.media !== currentMedia) {
		currentMedia = opts.media;
		await emulateMedia({ media: opts.media }).catch(() => {});
		awaitNextFrame = true;
	}

	if (awaitNextFrame) {
		await nextFrame();
	}

}
