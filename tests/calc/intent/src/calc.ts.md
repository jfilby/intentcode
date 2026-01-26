# Calc

## enum:Operation

plus = '+'
minus = '-'
multiple = '*'
divide = '/'


## types:InputType

op?: Operation
value?: number


## fn:run

parameters:
- input: string


steps[] = Convert input to an array of InputType
Put brackets around steps using arithmetic precendence
answer = Solve the steps
Return answer

