import { SourceNode } from '@prisma/client'
import { ExtensionsData } from './source-graph-types'
import { ProjectDetails } from './server-only-types'

export enum BuildStageType {
  // Specs to IntentCode
  defineTechStack = 'define-tech-stack',
  specsToIntentCode = 'specs-to-intentcode',
  // IntentCode to Source
  compile = 'compile',
  index = 'index',
  updateDeps = 'update-deps',
  // Verify
  verifyInternals = 'verify-internals'
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

  // Numbered projects
  projectsMap: Map<number, ProjectDetails>
}
