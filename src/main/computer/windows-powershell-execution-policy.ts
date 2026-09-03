export type WindowsPowerShellExecutionPolicy = 'RemoteSigned' | 'Bypass'

export function buildWindowsPowerShellFileArgs(
  scriptPath: string,
  operationPath: string,
  executionPolicy: WindowsPowerShellExecutionPolicy
): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    executionPolicy,
    '-File',
    scriptPath,
    operationPath
  ]
}

export function isPowerShellExecutionPolicyBlocked(text: string): boolean {
  const haystack = text.toLowerCase()
  return haystack.includes('execution policy') || haystack.includes('running scripts is disabled')
}
