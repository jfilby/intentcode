import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Calc } from './calc';

/**
 * Utility class for console interactions.
 */
export class ConsoleUtils {
  /**
   * Reads a line of input from the console.
   */
  public static async readLine(prompt: string): Promise<string> {
    const rl = readline.createInterface({ input, output });
    try {
      return await rl.question(prompt);
    } finally {
      rl.close();
    }
  }
}

export class Index {
  /**
   * Main entry point for the Calculator demo.
   */
  public static async main(): Promise<void> {
    const calc = new Calc();

    console.log("Welcome to the Calculator demo!");
    console.log("Enter 'exit' to quit");

    while (true) {
      try {
        const userInput = await ConsoleUtils.readLine('> ');
        const trimmedInput = userInput.trim();

        if (trimmedInput.toLowerCase() === 'exit') {
          break;
        }

        if (!trimmedInput) {
          continue;
        }

        const answer = calc.run(trimmedInput);
        console.log(answer);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
      }
    }
  }
}

// Execution for ts-script compatibility
if (require.main === module) {
  Index.main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}