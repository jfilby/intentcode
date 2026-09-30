/**
 * The `intent` command.
 *
 * The project a command runs against is the one whose `intent.toml` is in the
 * working directory, so the engine is run from inside the project it is asked
 * about. A directory without an intent.toml is not a project, and the CLI
 * says so rather than carrying on without one.
 *
 * There is no menu: run without a command and the CLI prints its usage.
 *
 * The command itself runs inside a bubblewrap sandbox, so an agent session
 * cannot reach past the project it is working on. This process is the one
 * outside it: it settles what the command will touch, starts the sandboxed
 * run of the same command, and reports how that run ended.
 */

import { join, resolve } from 'node:path'
import { input } from '@inquirer/prompts'
import { IntentError, isIntentError } from './core/errors.js'
import { CliService } from './services/setup/cli-service.js'
import { readProject } from './core/project.js'
import { createProjectStore } from './core/store.js'
import { SetupService } from './services/setup/setup-service.js'
import { SandboxService } from './services/utils/sandbox-service.js'
import { PathsService } from './services/utils/paths-service.js'

// The credentials come from a .env beside the project, or from the
// environment. Node reads the file itself; a missing one is not an error,
// because a project can name its model in intent.toml and take the key from
// the shell.
try {
  process.loadEnvFile(join(process.cwd(), '.env'))
} catch {
  // No .env: the environment alone has to do.
}

const main = async (): Promise<void> => {

  const cliService = new CliService()
  const setupService = new SetupService()
  const sandboxService = new SandboxService()
  const pathsService = new PathsService()

  const command = process.argv[2]

  // No command is a usage error rather than a menu to open: every command is
  // an argument, and there is nothing to choose between without one.
  if (command == null) {
    throw new IntentError({
      category: 'ValidationError',
      stage: 'cli',
      message: `no command given`,
      detail: cliService.usage()
    })
  }

  // The working directory is the project: its intent.toml is the only record
  // of one there is.
  const project = await readProject()

  // A sandbox can only bind what a command is going to touch, so the paths
  // outside the project are settled here rather than inside it. Two commands
  // reach outside: `tests` builds the engine's own examples, which are
  // projects of their own, and `load-extensions` is told where to copy
  // extensions from.
  const extraPaths: string[] = []
  let extensionsPath: string | undefined

  if (command === cliService.testsCommand) {
    extraPaths.push(pathsService.getExamplesPath())
  }

  if (command === cliService.loadExtensionsCommand) {
    console.log(``)
    extensionsPath = resolve(
      await input({ message: `Enter the path to load extensions from` }))
    extraPaths.push(extensionsPath)
  }

  // From here this process is only the launcher: the command runs again
  // inside the sandbox, and this one reports how that run ended.
  await sandboxService.enter({
    projectPath: project.path,
    extraPaths
  })

  const store = createProjectStore(project.path)

  // Seeding writes a record only when there is not one already, so it runs
  // before every command rather than being a step the user has to remember.
  await setupService.setup(store)

  await cliService.runCommand(store, project, command, extensionsPath)
}

main()
  .then(async () => {
    process.exit(0)
  })
  .catch((error) => {
    // A failure the engine described prints its own message; anything else is
    // a bug and prints its stack, because there is no stage to attribute it
    // to and hiding it would only make it harder to report.
    if (isIntentError(error)) {
      console.error(``)
      console.error(`${error.category}: ${error.message}`)
      if (error.detail != null) console.error(`${error.detail}`)
      process.exit(1)
    }

    console.error(error)
    process.exit(1)
  })
