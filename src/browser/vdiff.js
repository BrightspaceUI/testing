import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

let test;

chai.Assertion.addMethod('golden', function(...args) {
	return ScreenshotAndCompare.call({ test, elem: this._obj }, ...args); // eslint-disable-line no-invalid-this
});
mocha.setup({ // eslint-disable-line no-undef
	rootHooks: {
		beforeEach() {
			test = this.currentTest;
		}
	}
});

async function ScreenshotAndCompare(opts) {

	if (window.d2lTest) {
		inlineStyles(this.elem);
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
		expect.fail(result.message);
	}
}

const disallowedProps = ['width', 'inline-size'];
let count = 0;

function inlineStyles(elem) {
	// headed chrome takes screenshots by first moving the element, which
	// breaks the hover state. So, copy currently styles inline before screenshot
	if (window.d2lTest.hovering && window.chrome) {
		count += 1;
		document.documentElement.classList.add('screenshot');
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
				[...computedStyle].forEach(prop => {
					if (!disallowedProps.includes(prop)) {
						const value = computedStyle.getPropertyValue(prop);
						sheet.insertRule(`.__d2lTestHovering-${count}::${pseudoEl} { ${prop}: ${value} !important; }`);
					}
				});
				elem.getRootNode().adoptedStyleSheets.push(sheet);
			}
		});
	}
}
