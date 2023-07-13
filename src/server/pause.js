window.d2lTestPause = new Promise(r => window.d2lTestStart = r);

const controls = `
	<div style="padding: 1rem; background: #ddd; border-bottom: 1px solid #888; color: #222">
		<div id="start">
			<button id="start-button" style="margin-inline-end: 1rem;">Start</button>
			<span>.${window.__WTR_CONFIG__.testFile.split('?')[0]}</span>
		</div>
		<div id="run" hidden>
			<button id="run-button" style="margin-inline-end: 1rem;">Run</button>
			<span id="test-name"></span>
		</div>
	</div>
`;

document.documentElement.insertAdjacentHTML('afterBegin', controls);

document.querySelector('#start-button').addEventListener('click', start);

const runBtn = document.querySelector('#run-button');
runBtn.addEventListener('click', run);

const testName = document.querySelector('#test-name');

beforeEach(function() { // eslint-disable-line no-undef
	testName.innerText = this.currentTest.fullTitle(); // eslint-disable-line no-invalid-this
	runBtn.disabled = false;
});

function run() {
	runBtn.disabled = true;
	window.d2lTestRun();
}

function start() {
	document.querySelector('#start').hidden = true;
	document.querySelector('#run').hidden = false;
	window.d2lTestStart();
}

await window.d2lTestPause;
window.d2lTestPause = new Promise(r => window.d2lTestRun = r);
