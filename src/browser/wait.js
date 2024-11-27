import { aTimeout, nextFrame } from '@open-wc/testing';

class DomSnapshot {
	constructor(element) {
		this._roots = [element.outerHTML];
		this._addShadowRoots = this._addShadowRoots.bind(this);
		this._addShadowRoots(element);
	}

	equals(other) {
		if (!other || this._roots.length !== other._roots.length) {
			return false;
		}

		for (let i = 0; i < this._roots.length; i++) {
			if (this._roots[i] !== other._roots[i]) {
				return false;
			}
		}

		return true;
	}

	_addShadowRoots(element) {
		if (element.shadowRoot) {
			this._roots.push(element.shadowRoot.innerHTML);
			Array.from(element.shadowRoot.children).forEach(this._addShadowRoots);
		}

		if (element.children) {
			Array.from(element.children).forEach(this._addShadowRoots);
		}
	}
}

function getUpdatePromises(element, updateAwaiters) {
	if (element.updateComplete) {
		updateAwaiters.push(element.updateComplete);
	}

	if (element.shadowRoot) {
		Array.from(element.shadowRoot.children).forEach(child => getUpdatePromises(child, updateAwaiters));
	}

	if (element.children) {
		Array.from(element.children).forEach(child => getUpdatePromises(child, updateAwaiters));
	}
};

/**
 * Waits for an element (and its children) to finish updating. While there is no
 * foolproof way to ensure that the element will no longer update without user
 * interaction, this function performs a number of checks in a loop, and is able
 * to handle most causes of element changes to safely wait for it to fully
 * finish updating. Additional checks can be added to the loop by providing a
 * customAwaiter function in the options object.
 *
 * @param {Element} element - The element to await
 * @param {?Object} [options]
 * @param {number} [options.timeout=0] - Timeout in milliseconds (0 for none)
 * @param {boolean} [options.failOnTimeout=true] - If true (default), this
 *     function will throw an error if the timeout is exceeded. Otherwise, it
 *     will simply return normally after the timeout expires.
 * @param {boolean} [options.awaitHypermedia=true} - If true (default), wait for
 *     all hypermedia requests to finish.
 * @param {?function(Element):Promise<boolean>} [options.customAwaiter] - An
 *     optional additional function to await on. If the function returns a
 *     Promise that resolves to a truthy value, all checks will be rerun and the
 *     function will be called again until it returns a falsey value or the
 *     timeout is reached.
 * @returns {Element} The HTML element passed into the first parameter
 * @throws {Error} If options.timeout is set and options.failOnTimeout is not
 *     set to false, then an error will be thrown on a timeout.
 */
export function waitUntilSettled(element, options) {
	options = Object.assign(
		{
			timeout: 0,
			failOnTimeout: true,
			awaitHypermedia: true,
			customAwaiter: null,
		},
		options,
	);

	if (options.timeout <= 0) {
		return _waitUntilSettledImpl(element, options);
	} else if (options.failOnTimeout) {
		return Promise.race([
			_waitUntilSettledImpl(element, options),
			aTimeout(options.timeout).then(() => element)
		]);
	} else {
		return Promise.race([
			_waitUntilSettledImpl(element, options),
			aTimeout(options.timeout).then(() => {
				throw new Error('Timeout waiting for element to finish updating');
			})
		]);
	}
};

async function _waitUntilSettledImpl(element, options) {
	const hasSirenActionQueue = options.awaitHypermedia &&
		window.D2L &&
		D2L.Siren &&
		D2L.Siren.ActionQueue &&
		D2L.Siren.ActionQueue.isPending &&
		D2L.Siren.ActionQueue.enqueue;

	let lastSnapshot = null;
	const startTime = Date.now();

	while (options.timeout <= 0 || Date.now() < startTime + options.timeout) {
		// Wait for next frame
		await nextFrame();

		// Wait for next event cycle
		await aTimeout(0);

		// Wait for events to stop firing
		if (window.requestIdleCallback) {
			await new Promise(resolve => requestIdleCallback(resolve));
		}

		// Check for pending/active siren web requests
		if (hasSirenActionQueue && D2L.Siren.ActionQueue.isPending()) {
			// Wait for current request queue to complete, then repeat all steps
			await new Promise(D2L.Siren.ActionQueue.enqueue);
			lastSnapshot = null;
			continue;
		}

		const updateAwaiters = [];
		getUpdatePromises(element, updateAwaiters);

		// Wait for any pending Lit element updates
		if (await Promise.all(updateAwaiters).then(x => x.includes(false))) {
			// At least one of the updates triggered another update. Repeat all steps.
			lastSnapshot = null;
			continue;
		}

		// If a custom awaiter was provided, run it
		if (options.customAwaiter && await options.customAwaiter(element)) {
			// Custom awaiter returned true. Start over.
			lastSnapshot = null;
			continue;
		}

		const snapshot = new DomSnapshot(element);
		if (!lastSnapshot) {
			// Everything that we can test looks settled.
			// Do one more loop and verify that the DOM hasn't changed
			lastSnapshot = snapshot;
			continue;
		}

		if (!snapshot.equals(lastSnapshot)) {
			// Something changed. Restart the whole process
			lastSnapshot = null;
			continue;
		}

		return element;
	}

	if (options.failOnTimeout) {
		throw new Error('Timeout waiting for element to finish updating');
	}

	return element;
}
