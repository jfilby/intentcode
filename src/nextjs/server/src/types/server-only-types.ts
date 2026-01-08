export class ServerOnlyTypes {

  // Versions
  static engineVersion = '0.0.1'

  // Instance types
  static projectInstanceType = 'P'

  // Important file extensions (with .)
  static dotMdFileExt = '.md'

  // Verbosity
  static verbosity = true

  // Source node generation
  static keepOldSourceNodeGenerations = 3

  // Libraries related
  static indexerAutoAddLibraries = true
  static compilerAutoAddLibraries = true

  // Valid depsNode keys
  static depsNodeKeys = ['runtimes', 'tool']
}

export enum DepDeltaNames {
  set = 'set',
  del = 'del'
}

export enum InstanceSettingNames {
  projectPath = 'project path'
}

export enum MessageTypes {
  errors = 'errors',
  warnings = 'warnings'
}

export enum LlmEnvNames {
  compilerEnvName = 'COMPILER_LLM_VARIANT_NAME',
  indexerEnvName = 'INDEXER_LLM_VARIANT_NAME'
}

export enum VersionNames {
  engine = 'Engine'
}

export interface DepDelta {
  delta: string
  name: string
  minVersion: string
}
