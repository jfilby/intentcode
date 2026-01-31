# Calc

## Operation (enum)

plus = '+'
minus = '-'
multiple = '*'
divide = '/'


## InputType (type)

op?: Operation
value?: number


## run (fn)

parameters:
- input: string


steps[] = Convert input to an array of InputType
Put brackets around steps using arithmetic precendence
answer = Solve the steps
Return answer

