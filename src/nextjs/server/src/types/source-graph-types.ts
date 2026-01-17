import { SourceNode } from '@prisma/client'

export enum SourceEdgeNames {

  implements = 'implements'
}

export enum SourceNodeTypes {

  // Project level
  project = 'Project',
  projectSpecs = 'Project specs',
  projectIntentCode = 'Project IntentCode',
  projectSourceCode = 'Project source code',

  deps = 'Deps',

  // has parents: projectSpecs/specsDir
  specsDir = 'Specs dir',

  // has parents: projectSpecs/specsDir
  specsFile = 'Specs file',

  // has parents: projectSpecs
  techStackJsonFile = 'Tech stack JSON file',

  // has parents: projectIntentCode/intentCodeDir
  intentCodeDir = 'IntentCode dir',

  // has parents: projectIntentCode/intentCodeDir
  intentCodeFile = 'IntentCode file',

  // has parents: intentCodeFile
  intentCodeIndexedData = 'IntentCode indexed data',

  // has parents: intentCodeFile
  intentCodeCompilerData = 'IntentCode compiler data',

  // has parents: projectSourceCode/sourceCodeDir
  sourceCodeDir = 'Source code dir',

  // has parents: projectSourceCode/sourceCodeDir
  sourceCodeFile = 'Source code file',

  // Extensions
  extensionsType = 'Extensions',
  extensionType = 'Extension',
  hooksType = 'Hooks',
  skillType = 'Skill',
}

export enum SourceNodeNames {

  projectSpecs = 'Project specs',
  projectIntentCode = 'Project IntentCode',
  projectSourceCode = 'Project source code',

  techStackJsonFile = 'Tech stack JSON file',

  compilerData = 'Compiler data',
  indexedData = 'Indexed data',

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
