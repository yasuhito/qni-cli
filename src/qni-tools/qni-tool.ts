const MAX_OUTPUT_BYTES = 50 * 1024;
const MAX_OUTPUT_LINES = 2000;

type TruncatedOutput = {
  content: string;
  truncated: boolean;
  totalLines: number;
  totalBytes: number;
  outputLines: number;
  outputBytes: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function truncateHead(content: string): TruncatedOutput {
  const totalBytes = Buffer.byteLength(content, "utf8");
  const lines = content === "" ? [] : content.endsWith("\n") ? content.slice(0, -1).split("\n") : content.split("\n");
  const totalLines = lines.length;
  if (totalLines <= MAX_OUTPUT_LINES && totalBytes <= MAX_OUTPUT_BYTES) {
    return { content, truncated: false, totalLines, totalBytes, outputLines: totalLines, outputBytes: totalBytes };
  }

  const outputLines: string[] = [];
  let outputBytes = 0;
  for (const line of lines) {
    const newlineBytes = outputLines.length === 0 ? 0 : 1;
    const lineBytes = Buffer.byteLength(line, "utf8") + newlineBytes;
    if (outputLines.length === MAX_OUTPUT_LINES || outputBytes + lineBytes > MAX_OUTPUT_BYTES) break;
    outputLines.push(line);
    outputBytes += lineBytes;
  }
  const truncatedContent = outputLines.join("\n");
  return {
    content: truncatedContent,
    truncated: true,
    totalLines,
    totalBytes,
    outputLines: outputLines.length,
    outputBytes: Buffer.byteLength(truncatedContent, "utf8")
  };
}

export type QniToolParams = {
  args?: string[];
  commands?: string[][];
  workdir?: string;
};

export type QniCommandDetail = {
  args: string[];
  circuitSvg?: string;
  latex?: string;
};

export type QniToolDetails =
  | { circuitSvg?: string; latex?: string; workdir: string }
  | { workdir: string; commands: QniCommandDetail[] };

export type QniExecResult = {
  stdout: string;
  stderr: string;
  code: number | null;
  killed: boolean;
};

export type FormattedOutput = {
  text: string;
  truncated: boolean;
};

export function validateQniToolParams(params: QniToolParams): void {
  const hasArgs = params.args !== undefined;
  const hasCommands = params.commands !== undefined;
  if (hasArgs === hasCommands) {
    throw new Error("qni tool requires exactly one of args or commands");
  }
  if (hasCommands && (
    params.commands!.length === 0
    || params.commands!.some((command) => command.length === 0)
  )) {
    throw new Error("qni tool commands must contain at least one non-empty command");
  }
}

function quoteShellArgument(argument: string): string {
  if (argument !== "" && /^[\p{L}\p{M}\p{N}_@%+=:,./-]+$/u.test(argument)) return argument;
  return `'${argument.replaceAll("'", `'"'"'`)}'`;
}

export function formatCommandHeading(args: readonly string[]): string {
  return `$ qni ${args.map(quoteShellArgument).join(" ")}`;
}

export async function truncateQniOutput(stdout: string): Promise<FormattedOutput> {
  const truncated = truncateHead(stdout);
  if (!truncated.truncated) return { text: stdout, truncated: false };

  const separator = truncated.content === "" || truncated.content.endsWith("\n") ? "" : "\n";
  const notice = `[Output truncated: ${truncated.outputLines} of ${truncated.totalLines} lines (`
    + `${formatSize(truncated.outputBytes)} of ${formatSize(truncated.totalBytes)})]`;
  return { text: `${truncated.content}${separator}${notice}`, truncated: true };
}

export async function formatCommandOutput(
  args: readonly string[],
  stdout: string
): Promise<FormattedOutput> {
  const output = await truncateQniOutput(stdout);
  return {
    text: output.text === ""
      ? formatCommandHeading(args)
      : `${formatCommandHeading(args)}\n${output.text}`,
    truncated: output.truncated
  };
}

export function formatQniExitError(result: QniExecResult): string {
  const stderr = result.stderr.trimEnd();
  return `${stderr ? `${stderr}\n` : ""}qni exited with status ${result.code}`;
}

export function formatBatchFailure(
  successfulOutputs: readonly string[],
  failedArgs: readonly string[],
  result: QniExecResult,
  failedIndex: number,
  totalCommands: number
): string {
  const blocks = [
    ...successfulOutputs.map((output) => output.trimEnd()),
    formatCommandHeading(failedArgs),
    formatQniExitError(result)
  ];
  const succeeded = failedIndex === 0
    ? "No commands succeeded."
    : `Commands ${failedIndex === 1 ? "1" : `1-${failedIndex}`} succeeded and their changes remain in the workdir.`;
  const firstNotRun = failedIndex + 2;
  const remainingCount = totalCommands - failedIndex - 1;
  const remaining = remainingCount === 0
    ? ""
    : remainingCount === 1
      ? ` Command ${firstNotRun} was not run.`
      : ` Commands ${firstNotRun}-${totalCommands} were not run.`;
  blocks.push(
    `Stopped at command ${failedIndex + 1} of ${totalCommands}. ${succeeded}${remaining}`
  );
  return blocks.join("\n");
}
