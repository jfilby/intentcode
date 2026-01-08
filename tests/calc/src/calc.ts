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

export class Calc {
  /**
   * Executes the calculation logic
   */
  public run(input: string): number {
    const steps = this.parseInput(input);
    const precedenceSteps = this.applyPrecedence(steps);
    return this.solve(precedenceSteps);
  }

  private parseInput(input: string): InputType[] {
    const tokens: InputType[] = [];
    const regex = /(\d+(\.\d+)?)|([\+\-\*\/])/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      if (match[1]) {
        tokens.push({ value: parseFloat(match[1]) });
      } else if (match[3]) {
        const opStr = match[3];
        let op: Operation | undefined;
        if (opStr === '+') op = Operation.plus;
        else if (opStr === '-') op = Operation.minus;
        else if (opStr === '*') op = Operation.multiple;
        else if (opStr === '/') op = Operation.divide;

        if (op) tokens.push({ op });
      }
    }
    return tokens;
  }

  private applyPrecedence(steps: InputType[]): InputType[] {
    const outputQueue: InputType[] = [];
    const operatorStack: Operation[] = [];
    const precedence: Record<string, number> = {
      [Operation.multiple]: 2,
      [Operation.divide]: 2,
      [Operation.plus]: 1,
      [Operation.minus]: 1
    };

    for (const token of steps) {
      if (token.value !== undefined) {
        outputQueue.push(token);
      } else if (token.op !== undefined) {
        while (
          operatorStack.length > 0 &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token.op]
        ) {
          outputQueue.push({ op: operatorStack.pop() });
        }
        operatorStack.push(token.op);
      }
    }

    while (operatorStack.length > 0) {
      outputQueue.push({ op: operatorStack.pop() });
    }

    return outputQueue;
  }

  private solve(steps: InputType[]): number {
    const stack: number[] = [];

    for (const token of steps) {
      if (token.value !== undefined) {
        stack.push(token.value);
      } else if (token.op !== undefined) {
        const b = stack.pop();
        const a = stack.pop();

        if (a === undefined || b === undefined) continue;

        switch (token.op) {
          case Operation.plus:
            stack.push(a + b);
            break;
          case Operation.minus:
            stack.push(a - b);
            break;
          case Operation.multiple:
            stack.push(a * b);
            break;
          case Operation.divide:
            stack.push(a / b);
            break;
        }
      }
    }

    return stack[0] || 0;
  }
}
