import:
- readline-sync
- ./calc

# Index (file)

## main (function)

- Print: 
  - Welcome to the Calculator demo!
  - Enter 'exit' to quit

- calc = new Calc()

- Loop until input is 'exit':
  - input = readline-sync.question('> ')
  - if input is 'exit' break
  - answer = calc.run(input)
  - Print the answer

