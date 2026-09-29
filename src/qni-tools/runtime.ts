export class QniRuntime {
  static executable(
    versions: NodeJS.ProcessVersions,
    execPath: string
  ): string {
    // A Bun-compiled Pi executable starts another Pi agent when passed qni.js.
    return versions.bun ? "node" : execPath;
  }
}
