import chalk from 'chalk'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout } from 'node:process'

export class ConsoleService {
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
