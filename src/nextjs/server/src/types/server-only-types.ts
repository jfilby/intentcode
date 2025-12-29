export class ServerOnlyTypes {

  // Instance types
  static projectInstanceType = 'P'

  // Instance names
  static localProjectName = 'Local'
}

export enum MessageTypes {
  errors = 'errors',
  warnings = 'warnings'
}

export enum LlmEnvNames {
  compilerEnvName = 'COMPILER_LLM_VARIANT_NAME',
  indexerEnvName = 'INDEXER_LLM_VARIANT_NAME'
}
