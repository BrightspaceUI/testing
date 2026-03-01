//@ts-check
/**
 * @typedef {{slowDuration?: number, golden?: object, new?: object, diff?: string, pixelsDiff?: number}} TestInfo
 * @typedef {import('@web/test-runner').TestSession} TestSession
 */

/**@type {Map<string, TestInfo>} */
const testInfoMap = new Map();

export class TestInfoManager {
	/**
	 *
	 * @param {TestSession} session
	 * @param {string} fullTitle
	 */
	constructor(session, fullTitle) {
		this.key = `${session.browser.name.toLowerCase()}|${session.testFile}|${fullTitle}`;
	}
	/**@param {string} [alt] */
	get(alt = '') {
		const testKey = this.getKey(alt);
		return testInfoMap.get(testKey);
	}

	/**@param {string} [alt] */
	getKey(alt = '') {
		return alt ? `${this.key}|${alt}` : this.key;
	}

	/**
	 * @param {TestInfo} testInfo
	 * @param {string} [alt]
	 */
	set(testInfo, alt = '') {
		const testKey = this.getKey(alt);
		if (testInfoMap.has(testKey)) {
			const info = /**@type {TestInfo}*/(this.get(alt));
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

/**
 * @param {TestSession} session
 * @param {string} fullTitle
 * @param {string} [alt]
 */
export function getTestInfo(session, fullTitle, alt = '') {
	return new TestInfoManager(session, fullTitle).get(alt);
}
