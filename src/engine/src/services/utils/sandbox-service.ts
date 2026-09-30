/**
 * The filesystem an agent session is given.
 *
 * A Pi session's tools are the engine's own process, so the only place a
 * session can be kept inside a project is the process itself. The CLI runs
 * itself again under bubblewrap before it does any work: the project is bound
 * read-write, and the directories above it are left out of the mount
 * namespace altogether. A tool call that reaches for `../../..` finds a
 * directory with nothing in it rather than the rest of the disk, and the
 * engine's own writes stay where the docs say they are — in the project.
 *
 * What stays visible is what running at all needs: the engine directory
 * (read-only — the bundle, the packages it loads and the extensions it
 * bundles), the system directories a program runs against, and Pi's config
 * root, which is where Pi keeps the sessions and databases it writes outside a
 * project. Everything else is absent rather than unread, so there is nothing
 * for a session to find by accident.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getAgentDir } from '@oh-my-pi/pi-coding-agent'
import { IntentError } from '@/core/errors.js'
import { PathsService } from './paths-service.js'

// Services
const pathsService = new PathsService()

// Types

export interface SandboxParams {

  /** The project the command is about: the one directory bound read-write. */
  projectPath: string

  /**
   * Directories beside the project that the command also writes, each bound
   * read-write. The engine's own examples are the case: `tests` builds them,
   * and they are projects of their own rather than part of this one.
   */
  extraPaths?: string[]
}

// Class
export class SandboxService {

  // Consts
  clName = 'SandboxService'

  /**
   * Set in the process bubblewrap starts, which is how that process knows it
   * is already the sandboxed one and must not start another.
   */
  envName = 'INTENTCODE_SANDBOX'
  envValue = 'bwrap'

  // Code

  /** Whether this process is the one bubblewrap started. */
  private isSandboxed(): boolean {
    return process.env[this.envName] === this.envValue
  }

  /**
   * Run the command again inside the sandbox and end this process with
   * whatever that one ended with, so the exit code a caller sees is the
   * sandboxed run's and not this one's. Returns without doing anything when
   * the process is already sandboxed, which is the child reaching this point.
   */
  async enter(params: SandboxParams): Promise<void> {

    // Debug
    const fnName = `${this.clName}.enter()`

    if (this.isSandboxed()) {
      return
    }

    // The command is this same script, run by this same runtime. The script
    // path is resolved here rather than passed on as it arrived, because the
    // sandboxed process starts in the project and a relative path would then
    // name a different file.
    const scriptPath = process.argv[1]

    if (scriptPath == null) {

      throw new IntentError({
        category: 'ConfigError',
        stage: fnName,
        message: `the engine was started without a script to re-run`
      })
    }

    const bwrapPath = this.getBwrapPath()

    const child = spawn(
      bwrapPath,
      [
        ...this.getSandboxArgs(params),
        '--',
        process.execPath,
        path.resolve(scriptPath),
        ...process.argv.slice(2)
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, [this.envName]: this.envValue }
      })

    // The child is this command from here on, so this process has nothing
    // left to do but report how it ended. A signal is reported the way a
    // shell reports one, so a killed run is not read as a failed one.
    const exitCode = await new Promise<number>((resolveExit, rejectExit) => {

      child.on('error', (error) => {

        rejectExit(new IntentError({
          category: 'ConfigError',
          stage: fnName,
          message: `could not run ${bwrapPath}`,
          detail: error.message
        }))

      })

      child.on('exit', (code, signal) => {

        if (signal != null) {

          const signalNumber =
            os.constants.signals[signal as keyof typeof os.constants.signals]

          resolveExit(signalNumber == null ? 1 : 128 + signalNumber)
          return
        }

        resolveExit(code ?? 1)
      })
    })

    process.exit(exitCode)
  }

  /**
   * The bubblewrap binary. There is no fallback and no way to run without it:
   * a session that can reach the rest of the disk is the fault this exists to
   * prevent, so a machine without it is told so rather than left unprotected.
   */
  private getBwrapPath(): string {

    // Debug
    const fnName = `${this.clName}.getBwrapPath()`

    const searchPath = process.env.PATH ?? ''
    const searchDirs = searchPath.split(path.delimiter).filter(dir => dir !== '')

    for (const dir of searchDirs) {

      const candidate = path.join(dir, 'bwrap')

      try {
        fs.accessSync(candidate, fs.constants.X_OK)
        return candidate
      } catch {
        // Not here: the next directory in PATH is the next place to look.
      }
    }

    throw new IntentError({
      category: 'ConfigError',
      stage: fnName,
      message: `bwrap not found on PATH`,
      detail: `an agent session runs in a bubblewrap sandbox, so the engine ` +
        `needs the bwrap binary (package bubblewrap) to start one`
    })
  }

  /**
   * The sandbox's shape: the namespaces it unshares and the directories it
   * binds. Read-write binds come last so a project nested inside another bind
   * is writable rather than the read-only mount showing through.
   */
  private getSandboxArgs(params: SandboxParams): string[] {

    // Debug
    const fnName = `${this.clName}.getSandboxArgs()`

    // The project is the one directory the command is about, so it is the one
    // that has to be there; a sandbox that could not bind it would not be a
    // sandbox, it would be a broken run.
    if (!fs.existsSync(params.projectPath)) {

      throw new IntentError({
        category: 'ProjectError',
        stage: fnName,
        message: `no project directory to sandbox: ${params.projectPath}`
      })
    }

    const enginePath = pathsService.getEnginePath()

    const args = [

      // Namespaces. The network is the one left alone: the model is reached
      // over it. Nested user namespaces are refused, so a session cannot
      // build its own way out of the one it is in.
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--unshare-cgroup-try',
      '--unshare-user',
      '--disable-userns',
      '--die-with-parent',

      // The pseudo-filesystems a process expects to find. /dev/shm is a
      // tmpfs because /dev brings none, and a runtime that shares memory
      // across processes looks for it there.
      '--proc', '/proc',
      '--dev', '/dev',
      '--tmpfs', '/dev/shm',
      '--tmpfs', '/tmp',

      // What a program runs against: its shared libraries, its configuration,
      // and resolv.conf — which on a systemd host is a symlink into /run, and
      // without it the model is unreachable. The runtime's own directory is
      // here so the process this starts has something to start.
      '--ro-bind-try', '/usr', '/usr',
      '--ro-bind-try', '/etc', '/etc',
      '--ro-bind-try', '/run', '/run',
      '--ro-bind-try', '/bin', '/bin',
      '--ro-bind-try', '/sbin', '/sbin',
      '--ro-bind-try', '/lib', '/lib',
      '--ro-bind-try', '/lib64', '/lib64',
      '--ro-bind-try', path.dirname(process.execPath),
      path.dirname(process.execPath),

      // The engine: the bundle, the packages it imports and the extensions it
      // bundles. Read-only, because the engine writes nothing here.
      '--ro-bind', enginePath, enginePath
    ]

    for (const extraPath of params.extraPaths ?? []) {
      args.push('--bind-try', extraPath, extraPath)
    }

    // The project, and Pi's own state. Both are written, so both are
    // read-write; everything else in this list is there to be executed or
    // read and never changed.
    args.push('--bind', params.projectPath, params.projectPath)

    for (const piPath of this.getPiPaths()) {
      args.push('--bind-try', piPath, piPath)
    }

    args.push('--chdir', params.projectPath)

    return args
  }

  /**
   * The directories Pi keeps outside a project: the config root it reads its
   * settings and install identity from, the agent directory it writes its
   * sessions and databases to, and the XDG directories it moves those into
   * when they are set.
   */
  private getPiPaths(): string[] {

    const piPaths = [

      // The config root, which Pi names by directory under the home directory
      // and which PI_CONFIG_DIR renames.
      path.join(os.homedir(), process.env.PI_CONFIG_DIR ?? '.omp'),

      // The agent directory, which PI_CODING_AGENT_DIR can move out of the
      // config root entirely, so it is asked of Pi rather than derived.
      getAgentDir()
    ]

    for (const xdgVar of ['XDG_DATA_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME']) {

      const xdgHome = process.env[xdgVar]

      if (xdgHome == null || xdgHome === '') continue

      piPaths.push(path.join(xdgHome, 'omp'))
    }

    return piPaths
  }
}
