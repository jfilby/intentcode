export enum Operation {
  plus = '+',
  minus = '-',
  multiple = '*',
  divide = '/'
}

export interface InputType {
  op?: Operation;
  value?: number;
}

/**
 * Calculator class to process arithmetic strings.
 */
export class Calc {
  /**
   * Main execution flow to calculate the result of an input string.
   */
  public run(input: string): number {
    const steps: InputType[] = this.parseInput(input);
    const answer: number = this.solveSteps(steps);
    return answer;
  }

  /**
   * Tokenizes the input string into a list of operations and values.
   */
  private parseInput(input: string): InputType[] {
    const tokens: InputType[] = [];
    const regex = /(\d+\.?\d*)|([\+\-\*\/])/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      if (match[1]) {
        tokens.push({ value: parseFloat(match[1]) });
      } else if (match[2]) {
        tokens.push({ op: match[2] as Operation });
      }
    }
    return tokens;
  }

  /**
   * Processes the tokens while respecting arithmetic precedence (Multiplication/Division first).
   */
  private solveSteps(steps: InputType[]): number {
    if (steps.length === 0) return 0;

    // Pass 1: Handle high-precedence operations (*, /) - Effectively 'putting brackets' around them
    const pass1: InputType[] = [];
    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      if (current.op === Operation.multiple || current.op === Operation.divide) {
        const left = pass1.pop();
        const right = steps[++i];
        if (left?.value !== undefined && right?.value !== undefined) {
          const result = current.op === Operation.multiple 
            ? left.value * right.value 
            : left.value / right.value;
          pass1.push({ value: result });
        }
      } else {
        pass1.push(current);
      }
    }

    // Pass 2: Handle low-precedence operations (+, -)
    if (pass1.length === 0) return 0;
    let total = pass1[0]?.value ?? 0;
    for (let i = 1; i < pass1.length; i += 2) {
      const op = pass1[i].op;
      const nextVal = pass1[i + 1]?.value;
      if (nextVal !== undefined) {
        if (op === Operation.plus) {
          total += nextVal;
        } else if (op === Operation.minus) {
          total -= nextVal;
        }
      }
    }

    return total;
  }
}