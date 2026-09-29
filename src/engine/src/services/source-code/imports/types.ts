export interface ImportsData {

  // Deps: name -> minVersionNo
  internalDependencies: Record<string, string>
  dependencies: Record<string, string>
}

export class JsTsSrcTypes {

  static includeFileExts: ['.js', '.jsx', '.ts', '.tsx']
  
  static ignoredFilePatterns = [
    /\.d\.ts$/, /\.map$/, /\.min\.js$/, /\.bundle\.js$/
  ]

  static ignoredDirs = new Set([

    // IntentCode
    '.intentcode',
    'intent',

    // Package managers
    'node_modules',
    'bower_components',
    'jspm_packages',

    // Build output
    'dist',
    'build',
    'out',
    'lib',
    'es',
    'esm',
    'cjs',
    '.next',
    '.nuxt',
    '.svelte-kit',
    '.vercel',
    '.output',

    // Caches
    '.cache',
    '.turbo',
    '.swc',
    '.parcel-cache',
    '.webpack',
    '.rollup.cache',

    // Coverage / test artifacts
    'coverage',
    '.nyc_output',

    // IDE / OS
    '.idea',
    '.vscode',
    '.DS_Store',

    // VCS
    '.git',
    '.hg',
    '.svn',

    // Logs / temp
    'logs',
    'tmp',
    'temp'
  ])

  // WalkDirConfig in serene-core-server >= 0.1.17 takes ignoreRegexs, tested
  // against the path relative to the walk root, in place of the removed
  // ignoreDirs / ignoreFilePatterns. Each ignored directory name becomes a
  // whole-segment match so a sibling such as 'distribution' is not skipped
  // just because it contains 'dist'.
  static ignoredDirRegexs: RegExp[] =
    [...JsTsSrcTypes.ignoredDirs].map(
      (dir) => new RegExp(`(^|[\\\\/])${dir}([\\\\/]|$)`))
}
