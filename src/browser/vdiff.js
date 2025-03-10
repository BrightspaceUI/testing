import { chai, expect } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

// start loading fonts early
[...document.fonts].forEach(font => font.load());

const DEFAULT_MARGIN = 10;
let test;

/* eslint-disable no-undef, no-invalid-this */
chai.Assertion.addMethod('golden', function(...args) {
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

function findTargets(elem) {
	if (!elem.shadowRoot) return [elem];
	const nestedTargets = elem.shadowRoot.querySelectorAll('.vdiff-target');
	if (nestedTargets.length === 0) return [elem];
	return Array.from(nestedTargets).reduce((acc, target) => [...acc, ...findTargets(target)], [elem]);
}

function findLargestRect(elems, margin) {
	let largestRect = { left: Number.MAX_SAFE_INTEGER, top: Number.MAX_SAFE_INTEGER, right: 0, bottom: 0 };
	let foundElemRect = false;
	elems.forEach(elem => {
		const targets = findTargets(elem);
		targets.forEach(target => {
			const targetRect = target.getBoundingClientRect();
			if (targetRect.width !== 0 && targetRect.height !== 0) {
				foundElemRect = true;
				largestRect = {
					left: Math.floor(Math.min(largestRect.left, targetRect.left)),
					top: Math.floor(Math.min(largestRect.top, targetRect.top)),
					right: Math.ceil(Math.max(largestRect.right, targetRect.right)),
					bottom: Math.ceil(Math.max(largestRect.bottom, targetRect.bottom))
				};
			}
		});
	});
	// no elements had a size, so pick a reasonable rect
	if (!foundElemRect) {
		largestRect = { left: margin, top: margin, right: margin + 1, bottom: margin + 1 };
	}
	const rect = {
		x: largestRect.left - margin,
		y: largestRect.top - margin,
		width: largestRect.right - largestRect.left + (margin * 2),
		height: largestRect.bottom - largestRect.top + (margin * 2)
	};
	// We need to handle RTL overflow/scroll scenarios because of Playwright limitations
	if (document.documentElement.getAttribute('dir') === 'rtl' && (largestRect.left < 0 || window.scrollX < 0)) {
		rect.x = -1 * largestRect.left - 1;
		rect.width = largestRect.right + margin;

		if (largestRect.top <= 0) {
			rect.y = window.scrollY;
			rect.height = largestRect.bottom + margin;
		}
		rect.width = Math.min(rect.width, document.documentElement.clientWidth);
		rect.height = Math.min(rect.height, document.documentElement.clientHeight);
		return { rect, fullPage: true };
	}
	return { rect, fullPage: false };
}

async function ScreenshotAndCompare(opts = {}) {

	if (window.d2lTest) {
		document.documentElement.classList.add('screenshot');
		inlineStyles(this.elem);
	}

	const name = this.test.fullTitle();
	let fullPage = false,
		rect = null;
	if (this.elem === document) {
		fullPage = true;
	} else {
		const elemsToInclude = [this.elem, ...this.elem.querySelectorAll('.vdiff-include')];
		const margin = opts.margin ?? DEFAULT_MARGIN;
		({ rect, fullPage } = findLargestRect(elemsToInclude, margin));
	}
	const slowDuration = this.test.slow();

	let result = await executeServerCommand('brightspace-visual-diff-compare', { name, fullPage, rect, slowDuration });
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
	// headed chrome takes screenshots by first moving the element and locking it down,
	// which breaks the hover state. So, copy current styles inline before screenshot
	if (window.d2lTest.hovering && window.chrome) {
		count += 1;
		document.documentElement.classList.add('screenshot');
		elem.classList.add(`__d2lTestHovering-${count}`);

		[...elem.children, ...elem.shadowRoot?.children ?? []].forEach(child => inlineStyles(child));

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
