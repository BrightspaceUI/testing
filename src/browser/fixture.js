/* eslint no-console: 0 */

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

	const update = elem?.updateComplete;
	if (typeof update === 'object' && Promise.resolve(update) === update) {
		await update;
		await nextFrame();
	}

	if (awaitLoadingComplete && typeof elem?.getLoadingComplete === 'function') {
		await elem.getLoadingComplete();
		await nextFrame();
	}

	const children = getComposedChildren(elem);
	await Promise.all(children.map(e => waitForElem(e, awaitLoadingComplete)));

}

export async function fixture(element, opts = {}) {
	console.log('before reset');
	await Promise.all([reset(opts), document.fonts.ready]);
	console.log('after reset');
	console.log('before wcFixture');
	const elem = await wcFixture(element);
	console.log('after wcFixture');
	console.log('before waitForElem');
	await waitForElem(elem, opts.awaitLoadingComplete);
	console.log('after waitForElem');

	console.log('before pause');
	await pause();
	console.log('after pause');
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
