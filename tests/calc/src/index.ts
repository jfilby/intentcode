import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Calc } from './calc';

export { Calc };

export class Index {
  /**
   * The main entry point that reads user input from the console,
   * processes it via the Calc class, and outputs the result.
   */
  public static async main(): Promise<void> {
    const rl = readline.createInterface({ input, output });

    try {
      const userInput = await rl.question('> ');
      const calc = new Calc();
      const answer = calc.run(userInput);
      console.log(answer);
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      rl.close();
    }
  }
}
