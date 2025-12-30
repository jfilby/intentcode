export enum SourceEdgeNames {

  implements = 'implements'
}

export enum SourceNodeTypes {

  intentCodeProject = 'IntentCode project',

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
  sourceCodeFile = 'Source code file'
}

export enum SourceNodeNames {

  compilerData = 'Compiler data',
  indexedData = 'Indexed data'
}
