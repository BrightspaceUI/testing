import { env } from 'node:process';
import { join } from 'node:path';

const isCI = !!env['CI'];
const METADATA_NAME = '.vdiff.json';
const ROOT_NAME = '.vdiff';

export const PATHS = {
	FAIL: 'fail',
	GOLDEN: 'golden',
	PASS: 'pass',
	METADATA: isCI ? METADATA_NAME : join(ROOT_NAME, METADATA_NAME),
	REPORT_ROOT: '.report',
	VDIFF_ROOT: ROOT_NAME
};
