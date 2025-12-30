export class ServerOnlyTypes {

  // Instance types
  static projectInstanceType = 'P'

  // Important file extensions (with .)
  static dotMdFileExt = '.md'
}

export enum MessageTypes {
  errors = 'errors',
  warnings = 'warnings'
}

export enum LlmEnvNames {
  compilerEnvName = 'COMPILER_LLM_VARIANT_NAME',
  indexerEnvName = 'INDEXER_LLM_VARIANT_NAME'
}
