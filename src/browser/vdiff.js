import { chai, expect, nextFrame } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

// start loading fonts early
[...document.fonts].map(font => font.load());

let test, soonPromise;

/* eslint-disable no-undef, no-invalid-this */
chai.Assertion.addMethod('golden', async function(...args) {
	await soonPromise?.catch(err => expect.fail(err));
	return ScreenshotAndCompare.call({ test, elem: this._obj }, ...args);
});

mocha.setup({
	rootHooks: {
		beforeEach() {
			test = this.currentTest;
		}
	}
});
/* eslint-enable */

async function ScreenshotAndCompare(opts) {
	if (window.d2lTest) {
		inlineStyles(this.elem);
		document.documentElement.classList.add('screenshot');
	}

	const name = this.test.fullTitle();
	const rect = this.elem.getBoundingClientRect();
	let result = await executeServerCommand('brightspace-visual-diff-compare', { name, rect, opts });
	if (result.resizeRequired) {
		this.test.timeout(0);
		result = await executeServerCommand('brightspace-visual-diff-compare-resize', { name });
	}

	if (window.d2lTest) document.documentElement.classList.remove('screenshot');

	if (!result.pass) {
		if (window.d2lTest?.pause) {
			window.d2lTest.fail();
			await window.d2lTest.retryResponse;
		}
		expect.fail(result.message);
	}

	window.d2lTest?.pass();
}

const disallowedProps = ['width', 'inline-size'];
let count = 0;
function inlineStyles(elem) {
	// headed chrome takes screenshots by first moving and locking down the element,
	// which breaks the hover state. So, copy current styles inline before screenshot
	if (!window.d2lTest.hovering || !window.chrome) return;

	count += 1;

	elem.classList.add(`__d2lTestHovering-${count}`);

	[...elem.children, ...elem.shadowRoot?.children ?? []].forEach(child =>	inlineStyles(child));

	const computedStyle = getComputedStyle(elem);
	[...computedStyle].forEach(prop => {
		if (!disallowedProps.includes(prop)) {
			elem.style[prop] = computedStyle.getPropertyValue(prop);
		}
	});

	['before', 'after'].forEach(pseudoEl => {
		const computedStyle = getComputedStyle(elem, `::${pseudoEl}`);
		if (computedStyle.content !== 'none') {
			const sheet = new CSSStyleSheet();

			const props = [...computedStyle].map(prop => {
				const value = computedStyle.getPropertyValue(prop);
				return disallowedProps.includes(prop) ? '' : `${prop}: ${value} !important;`;
			}).join('');

			sheet.insertRule(`.__d2lTestHovering-${count}::${pseudoEl} {${props}}`);
			elem.getRootNode().adoptedStyleSheets.push(sheet);
		}
	});
}
