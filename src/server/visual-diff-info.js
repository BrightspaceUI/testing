const testInfoMap = new Map();

export class TestInfoManager {
	constructor(session, fullTitle, slowDuration) {
		this.key = `${session.browser.name.toLowerCase()}|${session.testFile}|${fullTitle}`;
		if (!testInfoMap.has(this.key)) testInfoMap.set(this.key, { slowDuration, tests: {} });
	}
	get() {
		return testInfoMap.get(this.key);
	}

	set(testInfo, alt = 'default') {
		const tests = this.get().tests;

		if (!(alt in tests)) {
			tests[alt] = testInfo;
		} else {
			const info = tests[alt];
			for (const prop in testInfo) {
				if ((prop === 'golden' || prop === 'new') && prop in info) {
					info[prop] = { ...info[prop], ...testInfo[prop] };
				}
				info[prop] = testInfo[prop];
			}
		}
	}
}

export function getTestInfo(session, fullTitle) {
	return new TestInfoManager(session, fullTitle).get();
}
