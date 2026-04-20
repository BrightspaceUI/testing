const testInfoMap = new Map();

export class TestInfoManager {
	constructor(session, fullTitle) {
		this.key = `${session.browser.name.toLowerCase()}|${session.testFile}|${fullTitle}`;
	}
	get() {
		return testInfoMap.get(this.key);
	}

	set(testInfo, alt = 'default') {
		if (testInfoMap.has(this.key)) {
			const info = this.get()?.[alt] || {};
			testInfo.slowDuration = info.slowDuration;

			if (info.golden || testInfo.golden) {
				testInfo.golden = { ...info.golden, ...testInfo.golden };
			}
			if (info.new || testInfo.new) {
				testInfo.new = { ...info.new, ...testInfo.new };
			}
			testInfo.diff = testInfo.diff || info.diff;
		}
		const tests = testInfoMap.get(this.key) || {};
		testInfoMap.set(this.key, { ...tests, [alt]: testInfo });
	}
}

export function getTestInfo(session, fullTitle) {
	return new TestInfoManager(session, fullTitle).get();
}
