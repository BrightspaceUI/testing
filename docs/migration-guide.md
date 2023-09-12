# Migration Guide

This document outlines how to migrate a repo using `@open-wc/testing` helpers and/or the first generation [@brightspace-ui/visual-diff](https://github.com/BrightspaceUI/visual-diff) library to `@brightspace-ui/testing`.

Before starting, install `@brightspace-ui/testing` as a `devDependency` and include it in the repository's `package.json`. Similarly, once the migration is complete, `@open-wc/testing` can be removed.

## Unit Tests

Unit tests using the `@open-wc/testing` helpers can easily be migrated to use `@brightspace-ui/testing`'s versions with a few minor changes.

### Step 1: Adjust Imports

In test import statements, search and replace `from '@open-wc/testing'` with `from '@brightspace-ui/testing'`.

Before:

```javascript
import { fixture, oneEvent } from '@open-wc/testing';
```

After:

```javascript
import { fixture, oneEvent } from '@brightspace-ui/testing';
```

### Step 2: Sinon Fake Timers

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

### Step 3: No need to wait for `updateComplete`

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

### Step 4: Use Browser Interaction Helpers

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
import { focusElem, sendKeysElem } from '@brightspace-ui/testing';

it('should focus', async() => {
  const elem = await fixture(html`<button>hello</button>`);
  await sendKeysElem(elem, 'press', 'Enter');
});
```

### Step 5: Use `d2l-test-runner` Binary

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

## vdiff Tests

Breaking changes were made between the `@brightspace-ui/visual-diff` library and `@brightspace-ui/testing`'s vdiff functionality. These changes will require a migration, which is unfortunately only partially automated.

Overview of changes:

* File/directory name changes (automatic migration)
  * Suite names which were previously repeated in the directory and filename have been removed
  * Leading `d2l-` in suite names has been removed
  * Browser name (always `chromium` previously) is now included in the path
  * Local snapshots are now stored in a `.vdiff` directory at the root of the project (which should be listed in `.gitignore`)
  * CI goldens are still stored alongside the tests in a `golden` directory, but without `screenshots/ci`
* Fixtures were defined in HTML files and tests in JavaScript files. Both are now defined in JavaScript. (manual migration)
* Puppeteer was previously used to interact with the browser. It has been replaced with Playwright, but the browser can now be interacted with directly. (manual migration)

### Strategy for Large Repositories

For repositories with many vdiff tests, it may be easier to migrate a subset of tests at a time.

By working in this way, both the old and new vdiff libraries continue to run in parallel as tests are gradually migrated from one to the other. Then once all tests are migrated, the old infrastructure can be removed.

The automated migration tools described below support an optional file pattern to make a gradual migration process possible.

In CI, the old and new GitHub actions would also run in parallel during the transition period. Refer to the instructions to get the new version of the [vdiff GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/vdiff) configured in the repository.

### Step 1: Automatically Migrate Local Goldens

Before migrating a set of tests, it's helpful to first generate a local set of goldens using the old `@brightspace-ui/visual-diff` library.

```bash
d2l-test-runner vdiff migrate-local ./**/<location>/*
```

The optional location parameter can be used to migrate a subset of tests.

This will:

1. Install the old `@brightspace-ui/visual-diff` library
2. Run the old library to generate local goldens. Optional: pass a location to run a subset of tests.
3. Move the local goldens to their new location in the `.vdiff` directory

### Step 2: Manually Migrate Tests

For each test file being migrated:

1. Rename the JavaScript file from `*.visual-diff.js` to `*.vdiff.js`
2. Move the imports from the old `*.visual-diff.html` file to the top of the new JavaScript file. Do not import `@brightspace-ui/core`'s `typography.js` as it will be included automatically.
3. Add `import { expect, fixture, html } from '@brightspace-ui/testing';`
4. Move the defined fixtures from the HTML file to fixtures in the JavaScript file. Remove `id`s which were used solely for identifying the fixture for `getRect`.
5. Delete the old `*.visual-diff.html` file
6. Remove all the old Puppeteer, browser and VisualDiff setup code
7. Replace `async function() {` with `async () => {`
8. Rewrite everything using `page.$eval` to access the element directly (just like unit tests do)
9. Replace calls to `getRect` and `screenshotAndCompare` with `await expect(elem).to.be.golden()`. If `rect` was not passed in to take a screenshot of the whole page, use `await expect(document).to.be.golden()` instead.
10. Make use of the `focusElem`, `clickElem`, `sendKeysElem`, `oneEvent`, etc. helpers where possible

Before (`my-elem.visual-diff.html`):

```html
<html>
  <head>
    <script type="module">
      import '@brightspace-ui/core/components/typography/typography.js';
      import '../my-elem.js';
    </script>
  </head>
  <body class="d2l-typography">
    <div>
      <my-elem id="default"></my-elem>
    </div>
  </body>
</html>
```

Before (`my-elem.visual-diff.js`):

```javascript
import puppeteer from 'puppeteer';
import { VisualDiff } from '@brightspace-ui/visual-diff';

describe('my-elem', () => {

  const visualDiff = new VisualDiff('my-elem', import.meta.url);

  let browser, page;

  before(async() => {
    browser = await puppeteer.launch();
    page = await visualDiff.createPage(browser);
    await page.goto(`${visualDiff.getBaseUrl()}/test/my-elem.visual-diff.html`, { waitUntil: ['networkidle0', 'load'] });
    await page.bringToFront();
  });

  beforeEach(async() => {
    await visualDiff.resetFocus(page);
  });

  after(async() => await browser.close());

  it('default', async function() {
    await page.$eval('#default', (elem) => {
      const innerElem = elem.shadowRoot.querySelector('button');
      button.focus();
    });
    const rect = await visualDiff.getRect(page, '#default');
    await visualDiff.screenshotAndCompare(page, this.test.fullTitle(), { clip: rect });
  });

});
```

After (`my-elem.vdiff.js`):

```javascript
import '../my-elem.js'
import { expect, fixture, focusElem, html } from '@brightspace-ui/testing';

describe('my-elem', () => {

  it('default', async() => {
    const elem = await fixture(html`<my-elem></my-elem>`);
    await focusElem(elem.shadowRoot.querySelector('button'));
    await expect(elem).to.be.golden();
  });

});
```

Much less code, right?

### Step 3: Test Migration Locally

Test the migration by running `d2l-test-runner vdiff`, filtering by file using `--filter <file-name>` if appropriate.

If tests fail, run `d2l-test-runner report` to view an HTML report visualizing the differences.

Tips:

* If possible, line up the snapshot element size and viewport size to match the old values. This will result in a much clearer picture of any changes - or there may be none at all!
* The Daylight fonts and typography are now included automatically. If those weren't added previously, this will result in some font changes. It may be helpful to turn these off with inline styles (`font-family: auto; letter-spacing: normal;`, maybe `color: black; font-size: 20px;`) while developing or to get an initial "clean" CI run to verify there are no actual unexpected changes. They can then be removed before merging the new goldens.

### Step 4: Migrating CI Goldens

Finally! The last step is to automatically migrate the repo's CI goldens and add `.vdiff` to the repo's `.gitignore`. To do this, run:

```bash
d2l-test-runner vdiff migrate ./**/<location>/*
```

Again, the optional location parameter can be used to migrate a subset of tests.

Follow the instructions to get the new version of the [vdiff GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/vdiff) configured in the repository. Remember that for large repos both the old and new tests can be run together to enable a gradual migration.

## Troubleshooting

* Ensure that all calls to `fixture()` in tests are always contained inside `it`, `before` or `beforeEach` blocks. Otherwise the tests will not run and will fail silently.
* If a test works when only that file is run (using `filter` or `grep`), but not when multiple test files are run at the same time, it's likely highlighting a race condition in the test. Running tests concurrently means each test runs a bit slower.
* When in watch mode, if a test is covering the control toolbar (for example, a dialog's backdrop is blocking them) you can run `d2lTest.run()` in the developer console (`d2lTest.runAll()` and `d2lTest.skip()` coming soon)

