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
}
