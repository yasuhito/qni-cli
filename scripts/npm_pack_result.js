const fs = require('node:fs');
const path = require('node:path');

function resolvePackResult({ tempRoot, stdout, stderr }) {
  for (const json of extractJsonValues(stdout).reverse()) {
    const packEntry = findPackEntry(json);
    const reportedTarball = existingTarball(tempRoot, packEntry?.filename);

    if (reportedTarball) {
      return {
        files: packEntry.files
          .filter((file) => file && typeof file === 'object')
          .map((file) => file.path)
          .filter((filePath) => typeof filePath === 'string'),
        tarball: reportedTarball
      };
    }
  }

  const files = [];

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

function existingTarball(tempRoot, filename) {
  if (typeof filename !== 'string' || !filename.endsWith('.tgz')) {
    return undefined;
  }

  const resolvedRoot = path.resolve(tempRoot);
  const candidate = path.resolve(resolvedRoot, filename);
  if (path.dirname(candidate) !== resolvedRoot) {
    return undefined;
  }

  try {
    return fs.lstatSync(candidate).isFile() ? candidate : undefined;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function findPackEntry(json) {
  if (Array.isArray(json)) {
    return json.find(isPackEntry);
  }
  if (!json || typeof json !== 'object') {
    return undefined;
  }
  if (isPackEntry(json)) {
    return json;
  }

  return Object.values(json).find(isPackEntry);
}

function isPackEntry(entry) {
  return entry
    && typeof entry === 'object'
    && typeof entry.filename === 'string'
    && Array.isArray(entry.files);
}

function extractJsonValues(output) {
  const values = [];

  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== '[' && output[start] !== '{') {
      continue;
    }

    const end = findJsonEnd(output, start);
    if (end === -1) {
      continue;
    }

    try {
      values.push(JSON.parse(output.slice(start, end + 1)));
      start = end;
    } catch {
      // This opening bracket belonged to a noise line. Keep looking.
    }
  }

  return values;
}

function assertPackedFiles(packageRoot) {
  const requiredFiles = [
    'LICENSE',
    'benchmarks/quantum-katas/basic-gates/state-flip.md',
    'dist/bin/qni.js',
    'dist/qni-math/index.js',
    'examples/superdense-coding/circuit.qni',
    'libexec/qni_symbolic_run.py',
    'scripts/setup_symbolic_python.sh',
    'skills/qni-cli/SKILL.md',
    'skills/qni-cli/scripts/qni'
  ];

  for (const requiredFile of requiredFiles) {
    const entry = fs.lstatSync(path.join(packageRoot, requiredFile), { throwIfNoEntry: false });
    if (!entry?.isFile()) {
      throw new Error(`packed qni-cli is missing ${requiredFile}`);
    }
  }
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

module.exports = { assertPackedFiles, resolvePackResult };
