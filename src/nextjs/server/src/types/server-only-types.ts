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
