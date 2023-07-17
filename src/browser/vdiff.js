import { chai, expect, nextFrame } from '@open-wc/testing';
import { executeServerCommand } from '@web/test-runner-commands';

let test, soonPromise;

chai.Assertion.addMethod('golden', async function(...args) {
	await soonPromise?.catch(err => {
		expect.fail(err);
	});
	return ScreenshotAndCompare.call({ test, elem: this._obj }, ...args); // eslint-disable-line no-invalid-this
});

chai.Assertion.addChainableMethod('soon',
	() => { throw new TypeError('"soon" is not a function'); },
	async function() {
		let resolve, reject;
		soonPromise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});

		try {
			expect(this._obj).to.be.instanceof(HTMLElement); // eslint-disable-line no-invalid-this
		} catch (e) {
			reject(e.message);
		}

		await nextFrame();
		await this._obj.updateComplete; // eslint-disable-line no-invalid-this
		resolve();
	}
);

mocha.setup({ // eslint-disable-line no-undef
	rootHooks: {
		beforeEach() {
			test = this.currentTest;
		}
	}
});

async function ScreenshotAndCompare(opts) {
	await document.fonts.ready; // firefox fonts

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
	// headed chrome takes screenshots by first moving the element, which
	// breaks the hover state. So, copy currently styles inline before screenshot
	if (window.d2lTest.hovering && window.chrome) {
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
