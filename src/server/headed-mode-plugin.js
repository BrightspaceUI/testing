import { globSync } from 'glob';

export function headedMode({ open, watch, pattern }) {

	const files = globSync(pattern, { ignore: 'node_modules/**', posix: true });

	return {
		name: 'brightspace-headed-mode',
		async transform(context) {
			if ((watch || open) && files.includes(context.path.slice(1))) {
				return `
pause();
${context.body}
function play() {
	document.querySelector('#play').disabled = true;
	window.d2lTestPauseResolve();
}
function pause() {
	window.d2lTestPause = new Promise(r => window.d2lTestPauseResolve = r);
	const controls = '<div style="display: flex; padding: 1rem; background: #ccc; gap: 1rem; border-bottom: 1px solid #333;"><button id="play">play</button><span id="test-name"></span></div>';
	document.documentElement.insertAdjacentHTML('afterBegin', controls);
	const playBtn = document.querySelector('#play');
	playBtn.addEventListener('click', play);
	beforeEach(function() {
		document.querySelector('#test-name').innerText = this.currentTest.fullTitle();
		playBtn.disabled = false;
	});
}
`;
			}
		}
	};
}
