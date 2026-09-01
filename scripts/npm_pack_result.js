const fs = require('node:fs');
const path = require('node:path');

function resolvePackResult({ tempRoot, stdout, stderr }) {
  const json = extractLastJsonValue(stdout);
  const packEntry = findPackEntry(json);
  const filename = packEntry?.filename;
  const files = packEntry && typeof packEntry === 'object' && Array.isArray(packEntry.files)
    ? packEntry.files
      .filter((file) => file && typeof file === 'object')
      .map((file) => file.path)
      .filter((filePath) => typeof filePath === 'string')
    : [];

  if (typeof filename === 'string' && filename.length > 0) {
    return {
      files,
      tarball: path.join(tempRoot, filename)
    };
  }

  const fallbackTarballs = fs.readdirSync(tempRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
    .map((entry) => path.join(tempRoot, entry.name));

  if (fallbackTarballs.length === 1) {
    return {
      files,
      tarball: fallbackTarballs[0]
    };
  }

  throw new Error([
    `npm pack did not report a filename and found ${fallbackTarballs.length} fallback tarballs`,
    'stdout:',
    stdout,
    'stderr:',
    stderr
  ].join('\n'));
}

function findPackEntry(json) {
  if (Array.isArray(json)) {
    return json.find((entry) => entry && typeof entry === 'object' && typeof entry.filename === 'string');
  }
  if (!json || typeof json !== 'object') {
    return undefined;
  }
  if (typeof json.filename === 'string') {
    return json;
  }

  return Object.values(json)
    .find((entry) => entry && typeof entry === 'object' && typeof entry.filename === 'string');
}

function extractLastJsonValue(output) {
  let lastValue;

  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== '[' && output[start] !== '{') {
      continue;
    }

    const end = findJsonEnd(output, start);
    if (end === -1) {
      continue;
    }

    try {
      lastValue = JSON.parse(output.slice(start, end + 1));
      start = end;
    } catch {
      // This opening bracket belonged to a noise line. Keep looking.
    }
  }

  return lastValue;
}

function findJsonEnd(output, start) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < output.length; index += 1) {
    const character = output[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '[' || character === '{') {
      stack.push(character);
    } else if (character === ']' || character === '}') {
      const expectedOpening = character === ']' ? '[' : '{';
      if (stack.pop() !== expectedOpening) {
        return -1;
      }
      if (stack.length === 0) {
        return index;
      }
    }
  }

  return -1;
}

module.exports = { extractLastJsonValue, resolvePackResult };
