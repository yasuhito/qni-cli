#!/usr/bin/env node

import path = require('node:path');

import { createDispatcher } from '../dispatcher';

const projectRoot = path.resolve(__dirname, '../..');
const dispatcher = createDispatcher({
  env: process.env,
  projectRoot
});

process.exit(dispatcher.run(process.argv.slice(2)));
