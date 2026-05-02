#!/usr/bin/env node

import path = require('node:path');

import { createDispatcher } from '../dispatcher';
import { commandLineArgs } from '../process/process_compatibility';

const projectRoot = path.resolve(__dirname, '../..');
const dispatcher = createDispatcher({
  cwd: process.cwd(),
  env: process.env,
  projectRoot
});

process.exit(dispatcher.run(commandLineArgs(process.argv)));
