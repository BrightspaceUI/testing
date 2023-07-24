const test = window.d2lTest = {};
test.pause = new Promise(r => test.start = r);

const controls = `
       <style>
               #d2l-test-controls [hidden] {
                       display: none !important;
               }

               #d2l-test-controls #start, #run {
                       display: flex;
                       gap: 1em;
                       font-size: 18px;
                       font-family: 'Lato', sans-serif;
                       padding: 1em;
                       background: #fff;
                       color: #222;
                       margin: calc(-30px + -8px) calc(-30px + -8px) calc(30px + 8px);
                       flex-wrap: wrap;
                       align-items: center;
                       box-shadow: 0 0 5px rgba(0,0,0,.5);
               }

               #d2l-test-controls #start {
                       font-size: 24px;
                       height: 600px;
                       flex-direction: column;
                       justify-content: center;
                       margin-bottom: 0;
                       box-shadow: none;
               }

               #d2l-test-controls #test-name {
                       flex: 1;
               }

               #d2l-test-controls button {
                       font-family: 'Lato', sans-serif;
                       background-color: #e3e9f1;
                       color: #202122;
                       border-radius: .3em;
                       border-style: none;
                       font-weight: 700;
                       font-size: .9em;
                       margin: 0;
                       min-height: calc(2em + 2px);
                       outline: none;
                       padding: .55em 1.5em;
                       text-align: center;
                       line-height: 1em;
               }

               #d2l-test-controls button.primary {
                       color: #fff;
                       background-color: #006fbf;
               }

               #d2l-test-controls button:focus {
                       background-color: #cdd5dc;
               }

               #d2l-test-controls button:focus-visible {
                       box-shadow: 0 0 0 2px #fff, 0 0 0 4px #006fbf;
               }

               #d2l-test-controls button.primary:focus {
                       background-color: #004489;
               }

               #d2l-test-controls button[disabled] {
                       opacity: 0.5;
               }
       </style>
       <div id="d2l-test-controls">
               <div id="start">
                       <span>.${window.__WTR_CONFIG__.testFile.split('?')[0]}</span>
                       <button id="start-button" class="primary">Start</button>
               </div>
               <div id="run" hidden>
                       <button id="run-button" class="primary">Run</button>
                       <span id="test-name"></span>
                       <button id="run-all-button">Run All</button>
               </div>
       </div>
`;

document.body.insertAdjacentHTML('afterBegin', controls);

const startBtn = document.querySelector('#start-button');
startBtn.addEventListener('click', start);

const runAllBtn = document.querySelector('#run-all-button');
runAllBtn.addEventListener('click', runAll);

const runBtn = document.querySelector('#run-button');
runBtn.addEventListener('click', run);

const testName = document.querySelector('#test-name');

beforeEach(async function() { // eslint-disable-line no-undef
	const fixture = new Promise(r => test.update = r);
	const currentTest = this.currentTest; // eslint-disable-line no-invalid-this
	setTimeout(async() => {
		await fixture;
		testName.innerText = currentTest.fullTitle();
		if (test.pause) {
			runBtn.disabled = false;
			runBtn.focus();
		}
	});
});

function start() {
	document.querySelector('#start').hidden = true;
	document.querySelector('#run').hidden = false;
	test.start();
}

function run() {
	runBtn.disabled = true;
	test.run();
}

function runAll() {
	runAllBtn.disabled = true;
	test.pause = null;
	run();
}

await test.pause;
test.pause = new Promise(r => test.run = r);
