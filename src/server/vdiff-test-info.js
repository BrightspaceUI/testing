const testInfoMap = new Map();

export class TestInfoManager {
	constructor(session, fullTitle) {
		this.key = `${session.browser.name.toLowerCase()}|${session.testFile}|${fullTitle}`;
	}
	get(alt = '') {
		const testKey = this.getKey(alt);
		return testInfoMap.get(testKey);
	}

	getKey(alt = '') {
		return alt ? `${this.key}|${alt}` : this.key;
	}

	set(testInfo, alt = '') {
		const testKey = this.getKey(alt);
		if (testInfoMap.has(testKey)) {
			const info = this.get(alt);
			testInfo.slowDuration = info.slowDuration;

			if (info.golden || testInfo.golden) {
				testInfo.golden = { ...info.golden, ...testInfo.golden };
			}
			if (info.new || testInfo.new) {
				testInfo.new = { ...info.new, ...testInfo.new };
			}
			testInfo.diff = testInfo.diff || info.diff;
		}
		testInfoMap.set(this.getKey(alt), testInfo);
	}
}

export function getTestInfo(session, fullTitle, alt = '') {
	return new TestInfoManager(session, fullTitle).get(alt);
}
