/**
 * The `intent` command.
 *
 * Every command runs against a project, and a project is the nearest
 * directory above the working directory holding an `intent.toml`. A command
 * run outside one still works — there is a System project holding the bundled
 * extensions — but a build needs the working directory itself to be one, and
 * says so when it is not.
 *
 * Usage:
 *   intent <command>       run one command and exit
 *   intent <command> <dir> run it against the project at <dir>
 *
 * There is no menu: run without a command and the CLI prints its usage.
 */

import { join } from 'node:path'
import { IntentError, isIntentError } from './core/errors.js'
import { CliService } from './services/setup/cli-service.js'
import { ProjectRegistryService } from './services/projects/project-registry.js'
import { SetupService } from './services/setup/setup-service.js'

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
  const projectRegistryService = new ProjectRegistryService()
  const setupService = new SetupService()

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

  // The command may name the project directory, so a project can be built
  // from anywhere rather than only from inside it.
  const dir = process.argv[3] ?? process.cwd()

  const { project, store } =
    await projectRegistryService.getStoreForPath(dir)

  // Seeding is idempotent and cheap when there is nothing to do, so it runs
  // before every command rather than being a step the user has to remember.
  await setupService.setupIfRequired(store)

  await cliService.runCommand(store, project, command, dir)
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
