export enum BuildStageType {
  compile = 'compile',
  index = 'index',
  updateDeps = 'update-deps'
}

export interface IntentFileBuild {

  // Info
  filename: string

  // Build todo
  indexBuildNo: number
  compileBuildNo: number

  // Build history
  indexedSteps: number
  compiledSteps: number

  lastIndexed?: Date
  lastCompiled?: Date
  lastHooksRun?: Date

  errorInBuildNo?: number
  buildErrorMessage?: string
}

export interface BuildStage {

  // Build info
  buildNo: number
  buildStageType: BuildStageType

  // Dependency-related
  depsUpdated: boolean

  // IntentFile build by full-path filename
  intentFileBuilds: Record<string, IntentFileBuild>
}

export interface BuildData {

  // Build stages
  curBuildNo: number
  buildStages: BuildStage[]
  buildStageTypes: BuildStageType[]
}
