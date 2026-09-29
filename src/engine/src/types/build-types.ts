import type { SourceNodeRecord } from '@/core/records.js'
import { ExtensionsData } from './source-graph-types.js'
import { ProjectDetails } from './server-only-types.js'

export enum BuildStageType {
  // Specs to IntentCode
  defineTechStack = 'define-tech-stack',
  // IntentCode to Source
  intentCodeAnalyzer = 'intent-code-analyzer',
  compile = 'compile',
  updateDeps = 'update-deps',
  // Verify
  verifyInternals = 'verify-internals'
}

export interface BuildFromFile {
  filename: string
  relativePath: string
  fileModifiedTime: Date
  content: string
  fileNode: SourceNodeRecord
  targetFileExt: string
  targetFullPath?: string
}

export enum DepsTools {
  npm = 'npm'
}

export interface BuildStage {

  // Build info
  buildNo: number
  buildStageType: BuildStageType

  // Dependency-related
  depsUpdated: boolean
}

export interface BuildData {

  // Build stages
  curBuildNo: number
  buildStages: BuildStage[]
  buildStageTypes: BuildStageType[]

  // Extensions
  extensionsData: ExtensionsData

  // Numbered projects
  projects: Record<number, ProjectDetails>
}
