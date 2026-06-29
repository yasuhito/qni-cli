/**
 * TypeScript コマンド経路が責務を持つ CLI 引数とサブコマンドの検証エラー。
 * ./circuit.json のドメインエラーは引き続き CircuitFileError が責務を持つ。
 */
export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}

export function reportCommandRouteError(error: unknown): number {
  process.stderr.write(`${errorMessage(error)}\n`);
  return 1;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
