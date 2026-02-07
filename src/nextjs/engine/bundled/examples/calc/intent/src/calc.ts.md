# Calc (class)

## Operation (enum)

plus = '+'
minus = '-'
multiple = '*'
divide = '/'


## InputType (interface)

op?: Operation
value?: number


## run (function)

parameters:
- input: string


steps[] = Convert input to an array of InputType
Put brackets around steps using arithmetic precendence
answer = Solve the steps
Return answer

