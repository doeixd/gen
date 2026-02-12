export type GeneratedFileMap = Record<string, string>

export function runTemplate<TOptions>(
  templateFn: (options?: TOptions) => GeneratedFileMap,
  options?: TOptions
): GeneratedFileMap {
  return templateFn(options)
}

export function assertGeneratedFiles(
  files: GeneratedFileMap,
  expectedPaths: string[]
): { missing: string[]; extra: string[] } {
  const keys = Object.keys(files)
  const missing = expectedPaths.filter((path) => !keys.includes(path))
  const extra = keys.filter((path) => !expectedPaths.includes(path))
  return { missing, extra }
}

export function normalizeEol(input: string): string {
  return input.replace(/\r\n/g, '\n')
}

export function containsSnippets(content: string, snippets: string[]): boolean {
  const normalized = normalizeEol(content)
  return snippets.every((snippet) => normalized.includes(snippet))
}
