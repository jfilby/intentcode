import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Calc } from './calc';

export class Index {
  /**
   * Reads input from the console and processes it using the Calc class until the user exits.
   */
  public static async main(): Promise<void> {
    const rl = readline.createInterface({ input, output });
    const calc = new Calc();

    console.log("enter 'exit' to quit");

    try {
      while (true) {
        const userInput = await rl.question('> ');
        const trimmedInput = userInput.trim();

        if (trimmedInput.toLowerCase() === 'exit') {
          break;
        }

        if (!trimmedInput) {
          continue;
        }

        try {
          const answer = calc.run(trimmedInput);
          console.log(answer);
        } catch (error) {
          console.error('Error:', error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      rl.close();
    }
  }
}

// Execution for ts-script compatibility if required
if (require.main === module) {
  Index.main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}