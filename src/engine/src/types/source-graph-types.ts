import type { SourceNodeRecord } from '@/core/records.js'

export enum SourceEdgeNames {

  implements = 'implements'
}

export enum SourceNodeTypes {

  // Project level
  project = 'Project',
  projectDotIntentCode = 'Project .intentcode',
  projectSpecs = 'Project specs',
  projectIntentCode = 'Project IntentCode',
  projectSourceCode = 'Project source code',

  // Deps
  deps = 'Deps',

  // Builds
  builds = 'Builds',
  build = 'Build',

  dotIntentCodeDir = '.intentcode dir',
  specsDir = 'Specs dir',
  specsFile = 'Specs file',
  techStackJsonFile = 'Tech stack JSON file',

  intentCodeDir = 'IntentCode dir',
  intentCodeFile = 'IntentCode file',

  intentCodeIndexedData = 'IntentCode indexed data',
  intentCodeCompilerData = 'IntentCode compiler data',

  sourceCodeDir = 'Source code dir',
  sourceCodeFile = 'Source code file',

  projectIntentCodeAnalysisNode = 'IntentCode analysis',
  suggestion = 'Suggestion',

  // Extensions
  extensionsType = 'Extensions',
  extensionType = 'Extension',
  hooksType = 'Hooks',
  skillType = 'Skill',
}

export enum SourceNodeNames {

  projectSpecs = 'Project specs',
  builds = 'Builds',
  build = 'Build',

  projectDotIntentCode = 'Project .intentcode',
  projectIntentCode = 'Project IntentCode',
  projectSourceCode = 'Project source code',

  techStackJsonFile = 'Tech stack JSON file',

  compilerData = 'Compiler data',
  indexedData = 'Indexed data',

  projectIntentCodeAnalysisNode = 'IntentCode analysis',

  depsName = 'Dependencies',
  extensionsName = 'Extensions'
}

export interface SourceNodeGenerationData {
  modelId: string
  temperature?: number
  prompt: string
}

/**
 * The content of a project's deps node: the extensions it uses at what
 * version, the package manager its source is built with, and the libraries
 * those pull in. This is the engine's view of `deps.json`, and the file is
 * written from it.
 */
export interface DepsData {
  extensions?: Record<string, string>
  tool?: string
  runtimes?: Record<string, Record<string, string> | undefined>
  source?: {
    packageManager?: string
    deps?: Record<string, string>
  }
}

// Extensions

export interface ExtensionsData {
  extensionNodes: SourceNodeRecord[]
  skillNodes: SourceNodeRecord[]
  hooksNodes: SourceNodeRecord[]
}
