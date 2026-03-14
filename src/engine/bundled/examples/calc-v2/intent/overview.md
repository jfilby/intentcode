# Overview

This is a console program that:
1. Displays a welcome banner on start with usage notes.
2. Can run in either REPL mode (default) or a terminal UI (TUI) mode.
3. Prompts the user for a calculation.
4. Calculates and outputs the result.

## Usage

### REPL mode (default)

- Start the app
- Enter expressions at the prompt (`> `)
- Type `exit` to quit

### TUI mode

- Start the app with `--tui`
- The TUI shows:
  - An output/history pane (previous expressions and results)
  - An input line for the next expression

#### TUI controls

- Enter: evaluate the current input and append to history
- Esc or Ctrl+C: quit

