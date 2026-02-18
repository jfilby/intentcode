import chalk from 'chalk'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout } from 'node:process'

// Note: this class's console services can clash with other CLI libraries.

class ConsoleService {
  private rl = readline.createInterface({ input })

  async askQuestion(query: string): Promise<string> {

    // Reuse the class-level interface
    stdout.write(chalk.bold.cyan(query))
    const answer = await this.rl.question('')
    return answer
  }

  close(): void {
    this.rl.close()
  }
}

// Export a single instance so that the interface is only created once
export const consoleService = new ConsoleService()
