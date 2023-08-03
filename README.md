# @brightspace-ui/testing

[![NPM version](https://img.shields.io/npm/v/@brightspace-ui/testing.svg)](https://www.npmjs.org/package/@brightspace-ui/testing)

Testing utilities which are specifically designed and configured for Brightspace UI components and applications.

## Installation

Install from NPM:

```shell
npm install @brightspace-ui/testing
```

## Writing Tests

Tests leverage the familiar [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) test frameworks. Many of the available utilities are wrappers around or extensions of the excellent [@open-wc testing helpers](https://open-wc.org/docs/testing/helpers/).

### describe, it, assert & expect

Tests can be grouped into suites using `describe` and are defined inside `it` blocks.

Results can be verified using either the BDD-style `expect` or TDD-style `assert` syntax (although try not to mix & match).

```javascript
import { assert, expect } from '@brightspace-ui/testing';

describe('group of tests', () => {
  it('should multiply numbers', () => {
    expect(2 * 4).to.equal(8);
  });
  it('should subtract numbers', () => {
    assert.equal(4 - 2, 2);
  });
});
```

### Testing UI with Fixtures

To run tests against snippets of HTML (including web components), use the `html` string literal and the asynchronous `fixture()`.

```javascript
import { expect, html, fixture } from '@brightspace-ui/testing';

it('should have the correct class', async() => {
  const elem = await fixture(html`<div class="foo"></div>`);
  expect(elem).classList.contains('foo').to.be.true;
});
```

Each call to `fixture()` will restore the browser to its default state, making subsequent calls isolated from each other. There's therefore no need to manually restore the viewport, language, mouse, or keyboard in between tests.

#### Configuring the Viewport Size

The viewport defaults to `800px` wide by `800px` tall. To use different viewport sizes, pass a `viewport` option to `fixture()`.

```javascript
it('should work on small viewports', async() => {
  const elem = await fixture(html`<my-elem></my-elem>`, {
    viewport: { height: 300, width: 200 }
  });
  // do assertions
});
```

#### Configuring the Language or Text Direction

If the component under test has special multi-lingual or bidirectional text behavior, both a `language` and `rtl` (right-to-left) option are available.

```javascript
it('should work in French', async() => {
  const elem = await fixture(html`<my-elem></my-elem>`, {
    lang: 'fr'
  });
  // do assertions
});

it('should work in RTL', async() => {
  const elem = await fixture(html`<my-elem></my-elem>`, {
    rtl: true
  });
  // do assertions
});
```

If `lang` is set to Arabic (`ar`), the right-to-left option will automatically be enabled.

> **Note:** it's not recommended to use `language` configuration with visual-diff to solely test the correctness of translations. The [messageformat-validator](https://github.com/bearfriend/messageformat-validator) is a more efficient way to test translations.

### Accessibility Testing with aXe

Elements can be processed by the [aXe accessibility validator](https://github.com/dequelabs/axe-core), which will automatically fail the test if any violations are detected.

```javascript
it('should be accessible', async() => {
  const elem = await fixture(html`<button></button>`);
  // will fail since the button is not labelled
  await expect(elem).to.be.accessible();
})
```

> **Important:** the call to `to.be.accessible()` is asynchronous -- don't forget to `await` it!

### Using the Mouse

To hover over or click on a specific element, use `hoverElem(elem)` and `clickElem(elem)`.

```javascript
import { clickElem, fixture, hoverElem } from '@brightspace-ui/testing';

it('should hover over element', async() => {
  const elem = await fixture(...);
  await hoverElem(elem);
  // do assertions
});

it('should click on element', async() => {
  const elem = await fixture(...);
  await clickElem(elem);
  // do assertions
});
```

Alternatively, to hover over or click at viewport coordinates with the mouse, use `hoverAt(x, y)` or `clickAt(x, y)`:

```javascript
import { clickAt, hoverAt } from '@brightspace-ui/testing';

it('should hover at coordinate', async() => {
  await hoverAt(100, 200);
  // do assertions
});

it('should click at coordinate', async() => {
  await clickAt(100, 200);
  // do assertions
});
```

### Using the Keyboard

To place focus on an element using the keyboard, use `focusElem(elem)`. Doing so will trigger its `:focus-visible` CSS pseudo-class.

```javascript
import { fixture, focusElem } from '@brightspace-ui/testing';

it('should focus on element', async() => {
  const elem = await fixture(html`<button>elem</button>`);
  await focusElem(elem);
  // do assertions
});
```

To send particular keystrokes to the browser window or a specific element, use `sendKeys(action, keys)` or `sendKeysElem(elem, action, keys)`.

The `action` parameter must be one of:

* `type`: types a sequence of characters and **is not affected** by modifier keys such as holding down `Shift`
* `press`: presses a single key, which results in a `keydown` followed by a `keyup` and **is affected** by modifier keys such as `Shift`
* `down`: holds down a single key
* `up`: releases a single key

For a list of all available key values, refer to [key values for keyboard events](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values).

```javascript
import { fixture, sendKeysElem } from '@brightspace-ui/testing';

it('should type and press Enter', async() => {
  const elem = await fixture(html`<input type="text">`);
  await sendKeysElem(elem, 'type', 'Hello');
  await sendKeysElem(elem, 'press', 'Enter');
});
```

As demonstrated above, subsequent calls can be made to create key combinations.

### Waiting for Things

There are various scenarios where a test may need to wait before it can proceed.

#### Waiting for an Event

After interacting with components, to wait for a particular event to be dispatched use `oneEvent(elem, eventName)`.

```javascript
import { clickElem, fixture, oneEvent } from '@brightspace-ui/testing';

it('should wait for an event', async() => {
  const elem = await fixture(html`<my-elem></my-elem>`);
  clickElem(elem);
  await oneEvent(elem, 'some-event');
});
```

Note that the call to `clickElem` is not `await`-ed, since by the time it resolves the event will have already been dispatched.

An even safer approach would be to wrap that call in a `setTimeout`:

```javascript
setTimeout(() => clickElem(elem));
await oneEvent(elem, 'some-event');
```

#### Waiting for a Lit Element to Update

When using Lit-based components, it's common to create a fixture, modify some properties and then want to wait for those changes to be rendered.

This can be accomplished by waiting for [Lit's `updateComplete` lifecycle](https://lit.dev/docs/components/lifecycle/#updatecomplete) Promise to fulfill.

```javascript
it('should wait for updates', async() => {
  const elem = await fixture(html`<my-elem></my-elem>`);
  elem.someProp = 'foo';
  await elem.updateComplete;
});
```

#### Waiting for `setTimeout` or `requestAnimationFrame`

To wait a fixed amount of time (analogous to `setTimeout`), use `aTimeout`. To wait until the moment before browser repaints the screen (analogous to `requestAnimationFrame`), use `nextFrame`.

```javascript
import { aTimeout, nextFrame } from '@brightspace-ui/testing';

it('should wait', async() => {
  await aTimeout(100); // fulfills after 100ms
  await nextFrame(); // fulfills before next paint
});
```

#### Waiting For Asynchronous Components

`fixture()` will automatically wait for all nested Lit components to fulfill their `updateComplete` Promise. To tweak when a component's `updateComplete` fulfills, implement the [`getUpdateComplete()` lifecycle callback](https://lit.dev/docs/components/lifecycle/#getUpdateComplete).

In other scenarios, a component may have an initial loading state (e.g. loading spinner or skeleton) where `updateComplete` has already resolved in addition to another fully loaded state. To signal that `fixture()` should wait for this final state, implement `getLoadingComplete()`. It works the same way as `getUpdateComplete()` by fulfilling its Promise when the component has fully loaded.

```javascript
class SlowElem extends LitElement {
  render() {
    return html`<p>I take my time</p>`;
  }
  async getLoadingComplete() {
    return new Promise(resolve => {
      setTimeout(() => resolve(), 2000);
    });
  }
}
```

To bypass waiting for `getLoadingComplete()`, set the `awaitLoadingComplete` configuration option to `false`:

```javascript
it('should not wait', async() => {
  const elem = await fixture(html`<slow-elem></slow-elem>`, {
    awaitLoadingComplete: false
  });
});
```

#### Waiting for a Condition

In cases where there are no other reliable hooks (like events, `getUpdateComplete()` or `getLoadingComplete()`), `waitUntil(condition)` can be used to wait for a particular condition to become `true`. The condition can optionally return a Promise.

```javascript
import { fixture, waitUntil } from '@brightspace-ui/testing';

it('should wait for condition', async() => {
  const elem = await fixture(...);
  await waitUntil(() => elem.foo === 'bar');
});
```

By default, `waitUntil` will poll every `50ms` and time out after `1000ms`. Those options can be configured:

```javascript
await waitUntil(() => elem.condition, {
  interval: 10,
  timeout: 2000
});
```

> **Note:** because `waitUntil` constantly polls, it can slow down test execution and should be avoided if possible.

### Defining a Custom Element for Testing

If a test requires a one-off custom element, define it using `defineCE` and pass the returned tag name in the call to `fixture()`.

```javascript
import { defineCE, fixture, html } from '@brightspace-ui/testing';

const tag = defineCE(
  class extends LitElement {
    static properties = {
      foo: { type: String }
    };
    render() {
      return html`hello`;
    }
  }
);

it('should use custom element', async() => {
  const foo = 'bar';
  const elem = await fixture(html`<${tag} foo="${foo}"></${tag}>`);
});
```

> **Important:** `defineCE` is not performant and shouldn't be used outside of tests.

### Visual-Diff Testing

Also known as "visual regression" or "perceptual diff", visual-diff testing involves taking snapshot images of the browser and comparing them against a known golden (or "baseline") image. The images are compared pixel-by-pixel and differences beyond a threshold will fail the test. Our visual diff testing leverages the [pixelmatch](https://github.com/mapbox/pixelmatch) library to perfom its comparison.

Unlike other tests, visual-diff tests must be in a file with the `*.vdiff.js` extension.

Use the asynchronous `.to.be.golden()` Chai assertion to take a visual-diff snapshot and compare it against its golden.

```javascript
import { fixture, html } from '@brightspace-ui/testing';

describe('my-elem', () => {
  describe('situation1', () => {
    it('state1', async() => {
      const elem = await fixture(html`<my-elem></my-elem>`);
      await expect(elem).to.be.golden();
    });
  });
});
```

The filename and location of the resulting image will be based on the suite names and test name. The top-most suite will become a directory, and any remaining suites will be combined with the test name into the file name. In this example, the snapshot would be stored in: `./my-elem/situation1-state1.png`

#### Configuring the Snapshot Area

By default, the snapshot area will be a rectangle around the source element plus a `10px` buffer margin on each side. To use a different margin, pass it as an option:

```javascript
await expect(elem).to.be.golden({ margin: 20 });
```

## Running Tests

TODO: note about leveraging @web/test-runner

## Debugging Tests

TODO

## Developing & Contributing

After cloning the repo, run `npm install` to install its dependencies.

### Testing

To run the full suite of tests:

```shell
npm test
```

Alternately, tests can be selectively run:

```shell
# binary unit tests
npm run test:bin

# browser unit tests
npm run test:browser

# server unit tests
npm run test:server

# vdiff tests
npm run test:vdiff
```

### Versioning & Releasing

This repo is configured to use the `semantic-release`. Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`.

To learn how to create major releases and release from maintenance branches, refer to the [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) documentation.
