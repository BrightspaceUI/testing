const test = window.d2lTest = {};
test.pause = new Promise(r => test.start = r);

const controls = `
	<style>
		.screenshot * {
			scrollbar-width: none;
		}

		.screenshot ::-webkit-scrollbar {
			display: none;
		}

		#d2l-test-controls [hidden] {
			display: none !important;
		}
		body {
			margin-top: 76px;
		}

		:not(.screenshot) body.fullscreen > #d2l-test-fixture-container {
			top: 76px;
		}

		.screenshot body {
			margin: 8px;
		}

		#d2l-test-controls {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			box-shadow: 0 0 5px rgba(0,0,0,.5);
			font-size: 20px;
			font-family: 'Lato', sans-serif;
			padding: .85em;
			background: #fff;
			color: #222;
		}

		.screenshot #d2l-test-controls {
			display: none;
		}

		#d2l-test-controls #start,
		#d2l-test-controls #run {
			display: flex;
			gap: 0.65em;
			align-items: center;
		}

		[dir="rtl"] #d2l-test-controls #run {
			flex-direction: row-reverse;
		}

		#d2l-test-controls #start {
			font-size: 22px;
			height: 600px;
			flex-direction: column;
			justify-content: center;
			margin-bottom: 0;
			box-shadow: none;
		}

		#d2l-test-controls #title {
			flex: 1;
			text-align: left;
			white-space: nowrap;
			margin: 0 0.5em;
			overflow: hidden;
		}

		#d2l-test-controls #test-name .title-sep {
			-webkit-user-select: none;
			user-select: none;
		}

		#d2l-test-controls #root-name {
			font-size: .7em;
			overflow: hidden;
			text-overflow: ellipsis;
			color: #999;
			line-height: 1;
		}

		#d2l-test-controls #test-name {
			font-size: 0.9em;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		#d2l-test-controls button {
			font-family: 'Lato', sans-serif;
			background-color: #e3e9f1;
			color: #202122;
			border-radius: .3em;
			border-style: none;
			font-weight: 700;
			font-size: .7em;
			margin: 0;
			min-height: calc(2em + 2px);
			outline: none;
			padding: calc(.55em * 1.43) calc(1.5em * 1.43);
			text-align: center;
			line-height: 1em;
			cursor: pointer;
		}

		#d2l-test-controls button.primary {
			color: #fff;
			background-color: #006fbf;
		}

		#d2l-test-controls button.subtle {
			color: #006fbf;
			background-color: transparent;
		}

		#d2l-test-controls button.subtle:focus,
		#d2l-test-controls button.subtle:hover {
			color: #004489;
			background-color: #e3e9f1;
		}

		#d2l-test-controls button:focus,
		#d2l-test-controls button:hover {
			background-color: #cdd5dc;
		}

		#d2l-test-controls button:focus-visible {
			box-shadow: 0 0 0 2px #fff, 0 0 0 4px #006fbf;
		}

		#d2l-test-controls button.primary:focus,
		#d2l-test-controls button.primary:hover {
			background-color: #004489;
		}

		#d2l-test-controls button[disabled] {
			cursor: default;
			opacity: 0.5;
		}
	</style>
	<div id="d2l-test-controls">
		<div id="start">
			<span>.${window.__WTR_CONFIG__.testFile.split('?')[0]}</span>
			<button id="start-button" class="primary">Start</button>
			<button id="skip-all-button" class="subtle">Skip</button>
		</div>
		<div id="run" hidden>
			<button id="run-button" class="primary">Run</button>
			<div id="title">
				<div id="root-name"></div>
				<div id="test-name"></div>
			</div>
			<button id="skip-button" class="subtle">Skip</button>
			<button id="run-all-button">Run All</button>
		</div>
	</div>
`;

document.body.insertAdjacentHTML('afterBegin', controls);

document.querySelector('#skip-all-button').addEventListener('click', skipAll);

const skipBtn = document.querySelector('#skip-button');
skipBtn.addEventListener('click', skip);

const startBtn = document.querySelector('#start-button');
startBtn.addEventListener('click', start);

const runAllBtn = document.querySelector('#run-all-button');
runAllBtn.addEventListener('click', runAll);

const runBtn = document.querySelector('#run-button');
runBtn.addEventListener('click', run);

const testName = document.querySelector('#test-name');
const rootName = document.querySelector('#root-name');

/* eslint-disable no-undef, no-invalid-this */
let currentTest, focusEl = runBtn;
beforeEach(async function() {
	const fixture = new Promise(r => test.update = r);
	test.hovering = false;
	currentTest = this.currentTest;

	if (test.skipAll) this.test.parent.ctx.skip();

	setTimeout(async() => {
		await fixture;

		const titlePath = currentTest.titlePath();
		testName.innerHTML = testName.title = titlePath.slice(1).join('<span class="title-sep"> ></span> ');
		rootName.innerText = titlePath[0];

		if (test.pause) {
			runBtn.disabled = false;
			skipBtn.disabled = false;
			focusEl.focus();
		}
	});
});
/* eslint-enable */

function start() {
	document.querySelector('#start').hidden = true;
	document.querySelector('#run').hidden = false;
	test.start();
}

function run() {
	focusEl = runBtn;
	runBtn.disabled = true;
	skipBtn.disabled = true;
	test.run();
}

function runAll() {
	runAllBtn.disabled = true;
	test.pause = null;
	run();
}

function skip() {
	focusEl = skipBtn;
	run();
	try {
		currentTest.skip();
	} catch { null; }
}

function skipAll() {
	test.skipAll = true;
	test.start();
}

await test.pause;
test.pause = new Promise(r => test.run = r);
