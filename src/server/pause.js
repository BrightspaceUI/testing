const test = window.d2lTest = {};
test.pause = new Promise(r => test.start = r);

const controls = `
	<style>

		.screenshot ::-webkit-scrollbar {
			display: none;
		}

		.screenshot body {
			margin: 8px;
		}

		.screenshot #d2l-test-controls {
			box-shadow: none;
			display: none;
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

		body {
			margin-top: 70px;
		}

		#d2l-test-controls [hidden] {
			display: none !important;
		}

		[dir="rtl"] #d2l-test-controls #run {
			flex-direction: row-reverse;
		}

		#d2l-test-controls #start,
		#d2l-test-controls #run {
			display: flex;
			gap: .65em;
			flex-wrap: wrap;
			align-items: center;
		}

		#d2l-test-controls #start {
			font-size: 22px;
			height: 600px;
			flex-direction: column;
			justify-content: center;
			margin-bottom: 0;
			box-shadow: none;
		}

		#d2l-test-controls #test-name {
			font-size: .9em;
			flex: 1;
			text-align: left;
			white-space: nowrap;
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
		#d2l-test-controls button:hover		{
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
			opacity: 0.5;
		}
	</style>
	<div id="d2l-test-controls">
		<div id="start">
			<span>.${window.__WTR_CONFIG__.testFile.split('?')[0]}</span>
			<button id="start-button" class="primary" style="margin-top: .65em;">Start</button>
			<button id="skip-all-button" class="subtle">Skip</button>
		</div>
		<div id="run" hidden>
			<button id="run-button" class="primary">Run</button>
			<span id="test-name"></span>
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

let currentTest, focusEl = runBtn;
beforeEach(async function() { // eslint-disable-line no-undef
	test.hovering = false;
	const fixture = new Promise(r => test.update = r);
	currentTest = this.currentTest; // eslint-disable-line no-invalid-this
	if (test.skipAll) this.test.parent.ctx.skip(); // eslint-disable-line no-invalid-this
	setTimeout(async() => {
		await fixture;
		testName.innerText = currentTest.fullTitle();
		if (test.pause) {
			runBtn.disabled = false;
			focusEl.focus();
		}
	});
});

function start() {
	document.querySelector('#start').hidden = true;
	document.querySelector('#run').hidden = false;
	test.start();
}

function run() {
	focusEl = runBtn;
	runBtn.disabled = true;
	test.run();
}

function runAll() {
	runAllBtn.disabled = true;
	test.pause = null;
	run();
}

function skip() {
	run();
	focusEl = skipBtn;
	try {
		currentTest.skip();
	} catch (e) { null; }
}

function skipAll() {
	test.skipAll = true;
	test.start();
}

await test.pause;
test.pause = new Promise(r => test.run = r);
