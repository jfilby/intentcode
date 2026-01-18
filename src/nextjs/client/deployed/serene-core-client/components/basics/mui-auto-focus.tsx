import { InputProps as StandardInputProps } from '@mui/material/Input'

export const autoFocusInputProps = (): StandardInputProps => {
  return {
    inputRef: (input) => {
      if (input) {
        input.focus()
      }
    },
  }
}

/* Example usage:

   <TextField
     ...
     InputProps={autoFocusInputProps()} />

*/
