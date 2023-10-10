# @brightspace-ui/testing

[![NPM version](https://img.shields.io/npm/v/@brightspace-ui/testing.svg)](https://www.npmjs.org/package/@brightspace-ui/testing)

Testing utilities which are specifically designed and configured for Brightspace UI components and applications.

> **Migrating from `@open-wc/testing` and/or `@brightspace-ui/visual-diff`?**
> Refer to the [Migration Guide](./docs/migration-guide.md) for help migrating a repo to `@brightspace-ui/testing`.

Install from NPM:

```shell
npm install @brightspace-ui/testing
```

## Writing Tests

Tests leverage the familiar [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) test frameworks. Many of the available utilities are wrappers around or extensions of the excellent [@open-wc testing helpers](https://open-wc.org/docs/testing/helpers/).

### describe, it, assert & expect

Tests can be grouped into suites using `describe` and are defined inside `it` blocks.

```javascript
describe('group of tests', () => {
  it('should test something', () => {
    // ...
  });
  it('should test something else', () => {
    // ...
  });
});
```

Results can be verified using either the BDD-style `expect` or TDD-style `assert` syntax (although try not to mix & match).

```javascript
import { expect } from '@brightspace-ui/testing';

it('should multiply numbers', () => {
  expect(2 * 4).to.equal(8);
});
```

```javascript
import { assert } from '@brightspace-ui/testing';

it('should multiply numbers', () => {
  assert.equal(2 * 4, 8);
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

If the component under test has special multi-lingual or bidirectional text behavior, both `language` and `rtl` (right-to-left) options are available.

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

> **Note:** it's not recommended to use `language` configuration with [vdiff](#vdiff-testing) to solely test the correctness of translations. The [messageformat-validator](https://github.com/bearfriend/messageformat-validator) is a more efficient way to test translations.

#### Configuring the Media Type

By default, tests will run using the `screen` media type. To use a different media type, pass a `media` option to `fixture()`.

```javascript
it('should work when printing', async() => {
  const elem = await fixture(html`<my-elem></my-elem>`, {
    media: 'print'
  });
  // do assertions
});
```

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

To send particular keystrokes to the browser window or a specific element, use `sendKeys(action, keys)` or `sendKeysElem(elem, action, keys)`. Note that `sendKeysElem` will focus on the element using the keyboard before sending the keys.

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

If the test needs to prevent the default behavior of the event, use `oneDefaultPreventedEvent`.

#### Waiting for a Lit Element to Update

When using Lit-based components, it's common to create a fixture and then modify some of its properties, which usually requires waiting for those changes to be rendered.

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

`fixture()` will automatically wait for all nested Lit components to fulfill their `updateComplete` Promise. To control when a component's `updateComplete` fulfills, implement the [`getUpdateComplete()` lifecycle callback](https://lit.dev/docs/components/lifecycle/#getUpdateComplete).

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

If a test requires a one-off custom element, define it using `defineCE` and pass the returned tag name to `fixture()`.

```javascript
import { defineCE, fixture } from '@brightspace-ui/testing';

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
  const elem = await fixture(`<${tag} foo="${foo}"></${tag}>`);
});
```

> **Important:** `defineCE` is not performant and shouldn't be used outside of test files.

## Running Tests

Use the `d2l-test-runner` binary to execute a set of tests and report their results. It builds upon the robust [@web/test-runner](https://modern-web.dev/docs/test-runner/overview/), while configuring it for Brightspace components and applications.

### CLI and Configuration

`d2l-test-runner` can be configured using CLI arguments or an optional configuration file.

#### CLI Arguments

| Name | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| group | `String` | `'test'` | Name of the test group to run |
| chrome | `Boolean` | `true` | Run tests in Chromium |
| firefox | `Boolean` | `true` | Run tests in Firefox |
| safari | `Boolean` | `true` | Run tests in Webkit |
| timeout | `Number` | `2000` | Test timeout threshold in ms |
| filter | `String` | | Filter test files by replacing wildcards with this glob |
| grep | `String` | | Only run tests matching this string or regexp |
| files | `String` | `'./test/**/*.<group>.js'` | Test files to run. Path or glob. |
| config | `String` | `'./d2l-test-runner.config.js'` | Location of config file |
| watch | `Boolean` | `false` | Reload tests on file changes. Allows debugging in all browsers. |
| open | `Boolean` | `false` | Open the browser in headed mode |
| slowmo | `Number` | | Slows down test operations by the specified number of milliseconds. Useful for debugging. |
| slow | `Number` | `75` | Tests whose duration in milliseconds are at most half of this threshold are "fast" and tests which exceed it are "slow" |

For example, to run all tests in the default `'test'` group in Firefox and with a `3s` timeout:

```bash
d2l-test-runner --firefox --timeout 3000
```

#### Configuration File

A `d2l-test-runner.config.js` file in the current working directory (or the value from the `config` CLI flag) can also be used to configure a subset of options.

```javascript
export default {
  slow: 100,
  slowmo: 50,
  timeout: 3000
};
```

For projects where tests are outside of the default `'./test/'` location, it may be useful to override the default pattern provider.

```javascript
export default {
  pattern: type => `./custom/**/*.${type}.js`
};
```

### Test Groups

Tests are organized into groups, which can be configured and run together.

The group name appears in the default `files` pattern (`'./test/**/*.<group>.js'`), making it typical for test files to have the group name as part of their extension. For example, the default group is `'test'` so all test files named `*.test.js` will belong to it by default. Similarly, the `vdiff` group contains files named `*.vdiff.js`.

To run tests which match the pattern `'./test/**/*.mygroup.js'`:
```bash
d2l-test-runner --group mygroup
```

The configuration file can also be used to set up custom groups:

```javascript
export default {
  groups: [{
    name: 'safari-only',
    files: './custom/*.safari.js'
    browsers: ['safari']
  }]
};
```

### Running a Subset of Tests

While writing or debugging tests, it can be desirable to focus the runner on a subset of tests.

### By File Name

Use the `filter` option to filter by file name. It replaces any wildcards in the file name portion of the `files` pattern with the provided [glob](https://en.wikipedia.org/wiki/Glob_(programming)).

For example, with the `'test'` group and default pattern `'./test/**/*.<group>.js'`, passing `d2l-test-runner --filter foo` will run tests which match `'./test/**/foo.test.js'`.

Wildcards can still be used but need to be escaped. So `d2l-test-runner --filter foo\*` will run tests which match `'./test/**/foo*.test.js'`.

### By Test Name

Use the `grep` option to filter by test name. Only tests whose names match the provided string or regular expression will be run, regardless of file name.

For example, `d2l-test-runner --grep foo` will run any test whose test suite(s) or name contains "foo".

> **Note:** unfortunately, tests which do not match the grep value will be reported as failed instead of skipped.

### Debugging Tests

When tests don't go as expected, the next step is usually to debug them using the browser's built-in developer tools.

There are two options for debugging:
* `watch`: after running `d2l-test-runner --watch`, choose "D" (debug in the browser) and select which test file to launch. The browser will stay open and reload whenever code changes occur.
* `open`: opens a browser window for each file sequentially and closes the window when the tests complete. For large projects, use it in combination with `filter` to limit which files are opened. For example: `d2l-test-runner --filter foo --open`.

With both `watch` and `open`, before starting the tests there is a chance to open the browser developer tools (if they don't open automatically). After starting, the browser debugger will be paused at the top of the file under test, providing an opportunity to attach breakpoints if desired. A toolbar at the top of the screen allows for each individual test to be skipped or run, as well as a "run all" option.

## Vdiff Testing

Short for "visual diff" and also known as "visual regression" or "perceptual diff", vdiff testing involves taking snapshot images of the browser and comparing them against a known golden (or "baseline") image. The images are compared pixel-by-pixel and differences beyond a threshold will fail the test. `@brightspace-ui/testing`'s vdiff leverages the [pixelmatch](https://github.com/mapbox/pixelmatch) library to perfom its comparison.

### Writing Vdiff Tests

Vdiff tests are written [just like other tests](#writing-tests), and the same utilities (`focusElem`, `oneEvent`, etc.) and `fixture` configuration options (viewport, language) are available.

Use the asynchronous `.to.be.golden()` Chai assertion to take a vdiff snapshot and [compare it against its golden](#generating-the-goldens).

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

### Configuring the Snapshot Area

By default, the snapshot area will be a rectangle around the target element plus a `10px` buffer margin on each side. To use a different margin, pass it as an option:

```javascript
await expect(elem).to.be.golden({ margin: 20 });
```

#### Capturing the Viewport

To capture the entire viewport, pass `document` as the target element to the assertion:

```javascript
await expect(document).to.be.golden();
```

#### Turning Off Full Page Padding

By default, the page hosting vdiff fixtures has `38px` of padding. For fixtures which are meant to fill the entire page with no surrounding whitespace, the page padding can be disabled:

```javascript
  await fixture(html`<fullscreen-elem></fullscreen-elem>`, {
    pagePadding: false
  });
  await expect(document).to.be.golden();
```

#### Including Other Elements

Elements using `absolute` or `fixed` positioning (like dropdowns or tooltips) may overflow the target element's capture area. To include them, apply the `vdiff-include` CSS class.

In this example, the tooltip is positioned below the button and would not be captured. By applying `vdiff-include` to one or more elements, the captured area becomes the rectangle containing the initial target and all additional `vdiff-include` elements.

```javascript
const elem = await fixture(html`
  <button style="position: relative;">
    hello
    <span class="vdiff-include" style="left: 0; position: absolute; top: 100%;">there</span>
  </span>
`);
await expect(elem).to.be.golden();
```

#### Changing the Vdiff Target

When writing custom elements, sometimes the host element's boundaries don't fully encapsulate the target area that vdiff should capture. In these scenarios, the `vdiff-target` CSS class can be applied to additional elements which should be included whenever the host element is captured.

In the following example, the absolutely positioned `<div>` will overflow the host element's boundaries and wouldn't normally be captured by vdiff. However, by adding the `vdiff-target` CSS class to the `<div>`, it gets added to the capture area.

```javascript
import { defineCE, fixture, html } from '@brightspace-ui/testing';

const tag = defineCE(
  class extends LitElement {
    render() {
      return html`
        hello
        <div class="vdiff-target" style="position: absolute; top: 400px;">there</div>
      `;
    }
  }
);
```

### Components with Motion

Components with animations or transitions can cause inconsistent vdiff snapshots, since small timing variations to the snapshot can catch the motion at slightly different points along its path. To help address this, `d2l-test-runner` configures the browser with the `prefers-reduced-motion` setting enabled.

To opt-in to this setting, adjust the component's animation/transition CSS such that it only applies the motion when `prefers-reduced-motion` is set to `no-preference`.

For example:

```css
my-elem {
  opacity: 1;
}
my-elem.faded-out {
  opacity: 0;
}
@media (prefers-reduced-motion: no-preference) { 
  my-elem {
    transition: opacity 0.2s ease-in-out;
  }
}
```

In addition to making vdiff testing more reliable, disabling or reducing motion based on the `prefers-reduced-motion` setting is recommended to help avoid discomfort for those with [vestibular motion disorders](https://www.a11yproject.com/posts/understanding-vestibular-disorders/).

### Running Vdiff Tests

Vdiff tests must be in files with the `*.vdiff.js` extension. They are run with the special `vdiff` command:

```bash
d2l-test-runner vdiff
```

By default vdiff tests will run only in Chrome, but any combination of the three browsers can be used:

```bash
d2l-test-runner vdiff --chrome --firefox --safari
```

[CLI arguments or configuration file](#cli-and-configuration) options can be used to filter/grep (`d2l-test-runner vdiff --filter foo`), debug (`d2l-test-runner vdiff --watch`), and so on.

### Continuous Integration

Vdiff testing becomes especially powerful when it can run as part of your repo's continuous integration process.

For repositories using GitHub Actions, the [vdiff GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/vdiff) can be leveraged. It will automatically run vdiff tests and commit goldens to source control. When changes to the goldens are detected, the action will publish a vdiff report and open a pull request to update the goldens.

Refer to the [vdiff GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/vdiff) documentation for more details and setup instructions.

### Generating the Goldens

To ensure a consistent environment, goldens checked into source control should be generated by [continuous integration](#continuous-integration). 

However, it can be helpful during development to generate a local version of the goldens to test and preview changes. This can be done by passing the `golden` sub-command:

```bash
d2l-test-runner vdiff golden
```

### Reports

When a vdiff test fails, an assertion failure stating that a certain number of pixels is different than the golden isn't especially helpful. To help visualize changes and aid in determining whether failures are expected, a HTML report is generated.

After running the tests, run the `report` sub-command to view the report:

```bash
d2l-test-runner vdiff report
```

The report supports filtering by status and browser, and allows for iteration through test files or tests within a file. It presents either a "full" view for quickly toggling between golden/new or a "split" side-by-side view. The diff changes can be optionally overlaid.

To help surface instances where a browser version change may be responsible for vdiff failures in the report, a `.vdiff.json` tracking file will be committed to the root of the repository.

## Developing and Contributing

After cloning the repo, run `npm install` to install its dependencies.

### Testing

To run the full suite of tests:

```shell
npm test
```

Alternatively, tests can be selectively run:

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

### Versioning and Releasing

This repo is configured to use `semantic-release`. Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`.

To learn how to create major releases and release from maintenance branches, refer to the [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) documentation.
