# Migration Guide

This document outlines how to migrate a repo using `@open-wc/testing` helpers and `@web/test-runner` to `@brightspace-ui/testing`.

### Step 1: Adjust Dependencies

Install `@brightspace-ui/testing` as a `devDependency` and include it in the repository's `package.json`.

```bash
npm install @brightspace-ui/testing --save-dev
```

If present in `package.json`, both `@open-wc/testing` and `@web/test-runner` dependencies can be removed.

### Step 2: Adjust Imports

In test import statements, search `from '@open-wc/testing'` and replace with `from '@brightspace-ui/testing'`.

Before:

```javascript
import { fixture, oneEvent } from '@open-wc/testing';
```

After:

```javascript
import { fixture, oneEvent } from '@brightspace-ui/testing';
```

### Step 3: Sinon Fake Timers

If any tests are using [Sinon's useFakeTimers](https://sinonjs.org/releases/latest/fake-timers/), ensure that the scope of what gets faked is limited.

For example, if a test requires that `setTimeout` be faked, pass `{ toFake: ['setTimeout'] }` to Sinon. This prevents Sinon from faking `requestAnimationFrame`, which will block calls to the new `fixture`.

Before:

```javascript
import { useFakeTimers } from 'sinon';

describe('my tests', () => {

  let clock;
  beforeEach(() => clock = useFakeTimers());
  afterEach(() => clock.restore());

});
```

After:

```javascript
import { useFakeTimers } from 'sinon';

describe('my tests', () => {

  let clock;
  beforeEach(() => clock = useFakeTimers(
    toFake: ['setTimeout']
  }));
  afterEach(() => clock.restore());

});
```

### Step 4: No need to wait for `updateComplete`

The `fixture()` in `@brightspace-ui/testing` differs from the `@open-wc/testing` version in that it waits for ALL nested Lit components' `updateComplete` to resolve.

Therefore, any tests which were previously manually `await`-ing various elements' `updateComplete` no longer need to do so. 🎉

Before:

```javascript
const elem = await fixture(html`
  <some-elem>
    <some-other-elem></some-other-elem>
  </some-elem>
`);
await elem.shadowRoot.querySelector('nested-elem').updateComplete;
await elem.querySelector('some-other-elem').updateComplete;
```

After:

```javascript
const elem = await fixture(html`
  <some-elem>
    <some-other-elem></some-other-elem>
  </some-elem>
`);
```

However, waiting for all nested `updateComplete`s means `fixture()` can be a bit slower. Therefore, tests that were relying on waiting for an event fired during the initial render will likely fail due to the event now firing during the `fixture()` call.

Those tests will need to be reworked to not rely on events fired during `render()`.

### Step 5: Use Browser Interaction Helpers

For tests which were manually calling `elem.click()` or `elem.hover()`, use the `clickElem()` and `hoverElem()` helpers. These helpers will trigger a real browser interaction using the mouse.

Before:

```javascript
it('should focus', async() => {
  const elem = await fixture(html`<button>hello</button>`);
  elem.click();
});
```

After:

```javascript
import { clickElem } from '@brightspace-ui/testing';

it('should focus', async() => {
  const elem = await fixture(html`<button>hello</button>`);
  await clickElem(elem);
});
```

If tests were manually focusing and/or dispatching keyboard events, use the `focusElem()` and `sendKeysElem()` helpers.

> **Note:** `sendKeysElem()` will focus on the element before sending the keys, so calling `focusElem()` beforehand isn't necessary.

Before:

```javascript
it('should press ENTER', async() => {
  const elem = await fixture(html`<input type="text">`);
  elem.focus();
  const eventObj = document.createEvent('Events');
  eventObj.initEvent('keypress', true, true);
  eventObj.keyCode = '13';
  elem.dispatchEvent(eventObj);
});
```

After:

```javascript
import { sendKeysElem } from '@brightspace-ui/testing';

it('should focus', async() => {
  const elem = await fixture(html`<button>hello</button>`);
  await sendKeysElem(elem, 'press', 'Enter');
});
```

### Step 6: Use `d2l-test-runner` Binary

Switch to `d2l-test-runner` from `web-test-runner`/`wtr` binaries in any `package.json` scripts.

By default, `d2l-test-runner` will:

* Run in Chrome, Firefox and Safari (except `vdiff` just runs in Chrome)
* Enable the `--node-resolve` flag
* Look for tests in `./test/**/*.test.js` (using the `test` group)
* Suppress `ResizeObserver` errors (a common reason repos use a config file)

Due to these new defaults, if the repo is using a `web-test-runner.config.js`, it may no longer be necessary and could be removed. If the config file is necessary, rename it to `d2l-test-runner.config.js`.

Before

```yml
  "scripts": {
    "test:unit": "web-test-runner --files \"./test/**/*.test.js\" --node-resolve"
  }
```

After:

```yml
  "scripts": {
    "test:unit": "d2l-test-runner"
  }
```
