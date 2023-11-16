import { nextFrame, fixture as wcFixture } from '@open-wc/testing';
import { reset } from './reset.js';

function getComposedChildren(node) {

	if (node?.nodeType !== Node.ELEMENT_NODE) {
		return [];
	}

	let nodes;
	const children = [];

	if (node.tagName === 'SLOT') {
		nodes = node.assignedNodes({ flatten: true });
	} else {
		if (node.shadowRoot) {
			node = node.shadowRoot;
		}
		nodes = node.children || node.childNodes;
	}

	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i].nodeType === 1) {
			children.push(nodes[i]);
		}
	}

	return children;

}

async function waitForElem(elem, awaitLoadingComplete = true) {

	if (!elem) return;

	const doWait = async() => {

		const update = elem.updateComplete;
		if (typeof update === 'object' && Promise.resolve(update) === update) {
			await update;
			await nextFrame();
		}

		if (awaitLoadingComplete && typeof elem.getLoadingComplete === 'function') {
			await elem.getLoadingComplete();
			await nextFrame();
		}

		const children = getComposedChildren(elem);
		await Promise.all(children.map(e => waitForElem(e, awaitLoadingComplete)));

	};

	await new Promise((resolve) => {
		const observer = new MutationObserver((records) => {
			for (const record of records) {
				for (const removedNode of record.removedNodes) {
					if (removedNode === elem) {
						observer.disconnect();
						resolve();
						return;
					}
				}
			}
		});
		observer.observe(elem.parentNode, { childList: true });
		doWait()
			.then(() => observer.disconnect())
			.then(resolve);
	});

}

export async function fixture(element, opts = {}) {
	await Promise.all([reset(opts), document.fonts.ready]);

	const parentNode = document.createElement('div');
	parentNode.setAttribute('id', 'd2l-test-fixture-container');

	const elem = await wcFixture(element, { parentNode });
	await waitForElem(elem, opts.awaitLoadingComplete);

	await pause();
	return elem;
}

async function pause() {
	const test = window.d2lTest || {};

	test.update?.();

	if (test.pause) {
		await test.pause;
		if (test.pause) test.pause = new Promise(r => test.run = r);
	}
}
