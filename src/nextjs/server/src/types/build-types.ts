import { SourceNode } from '@prisma/client'
import { ExtensionsData } from './source-graph-types'

export enum BuildStageType {
  compile = 'compile',
  index = 'index',
  updateDeps = 'update-deps'
}

export interface BuildFromFile {
  filename: string
  fileModifiedTime: Date
  content: string
  fileNode: SourceNode
  targetFileExt: string
  targetFullPath?: string
}

export enum DepsTools {
  npm = 'npm'
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

  // Extensions
  extensionsData: ExtensionsData
}
