export function thorArgumentsError(commandName: string, args: readonly string[], usage: string): string {
  return `ERROR: "${commandName}" was called with arguments ${rubyArray(args)}\nUsage: "${usage}"`;
}

export function rubyArray(values: readonly string[]): string {
  return `[${values.map((value) => `"${value}"`).join(', ')}]`;
}
