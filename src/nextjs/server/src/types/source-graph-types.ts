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

  sourceCodeDir = 'Source code dir',
  sourceCodeFile = 'Source code file'
}
