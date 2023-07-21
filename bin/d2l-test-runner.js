#!/usr/bin/env node
import { argv } from 'node:process';
import { runner } from '../src/server/cli/test-runner.js';

const options = await runner.getOptions(argv);

await runner.start(options);
