import { SourceNode } from '@prisma/client'

export enum SourceEdgeNames {

  implements = 'implements'
}

export enum SourceNodeTypes {

  intentCodeProject = 'IntentCode project',

  deps = 'Deps',

  // has parents: intentCodeProject/intentCodeDir
  intentCodeDir = 'IntentCode dir',

  // has parents: intentCodeProject/intentCodeDir
  intentCodeFile = 'IntentCode file',

  // has parents: intentCodeFile
  intentCodeIndexedData = 'IntentCode indexed data',

  // has parents: intentCodeFile
  intentCodeCompilerData = 'IntentCode compiler data',

  sourceCodeProject = 'Source code project',

  // has parents: sourceCodeProject/sourceCodeDir
  sourceCodeDir = 'Source code dir',

  // has parents: sourceCodeProject/sourceCodeDir
  sourceCodeFile = 'Source code file',

  // Extensions
  extensionsType = 'Extensions',
  extensionType = 'Extension',
  hooksType = 'Hooks',
  skillType = 'Skill',
}

export enum SourceNodeNames {

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
