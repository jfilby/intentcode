# Calc

## Enums

Operation:
  plus = '+'
  minus = '-'
  multiple = '*'
  divide = '/'


## Types

InputType:
  op?: Operation
  value?: number


## Inputs

input: string


## run()

steps[] = Convert input to an array of InputType
Put brackets around steps using arithmetic precendence
answer = Solve the steps
Return answer

