function commandEntries(help) {
  return new Set(
    [...help.matchAll(/^\s*(qni(?:\s+[a-z][a-z-]*)+)/gmu)].map((match) => match[1])
  );
}

function gateEntries(help) {
  const supportedGates = /^\s*Supported gates:\s*(.+)\.\s*$/mu.exec(help)?.[1];

  if (!supportedGates) {
    return new Set();
  }

  return new Set(supportedGates.split(',').map((gate) => gate.trim()));
}

function optionEntries(help) {
  const options = new Set();

  for (const match of help.matchAll(/--(?:\[(?<negated>no-)\])?(?<name>[a-z][a-z-]*)/gu)) {
    options.add(`--${match.groups.name}`);

    if (match.groups.negated) {
      options.add(`--${match.groups.negated}${match.groups.name}`);
    }
  }

  return options;
}

function parseHelpEntries(help) {
  return {
    commands: commandEntries(help),
    gates: gateEntries(help),
    options: optionEntries(help)
  };
}

function helpAdvertises(entries, name) {
  if (name.startsWith('qni ')) {
    return entries.commands.has(name);
  }

  if (name.startsWith('--')) {
    return entries.options.has(name);
  }

  return entries.gates.has(name);
}

module.exports = { helpAdvertises, parseHelpEntries };
