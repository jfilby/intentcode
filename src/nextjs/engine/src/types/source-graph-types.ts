import { SourceNode } from '@prisma/client'

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
  techId: string
  temperature?: number
  prompt: string
}

// Extensions

export interface ExtensionsData {
  extensionNodes: SourceNode[]
  skillNodes: SourceNode[]
  hooksNodes: SourceNode[]
}
