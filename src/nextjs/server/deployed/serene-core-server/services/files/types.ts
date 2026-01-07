export interface WalkDirConfig {

  recursive: boolean,
  fileExts?: string[]
  ignoreDirs?: Set<string>
  ignoreFilePatterns?: RegExp[]
}
