import { FormControl, InputLabel, TextareaAutosize } from '@mui/material'

interface Props {
  disabled?: boolean
  id: string
  label: string
  minRows: number
  onChange: any
  required?: boolean
  value: string
  style?: any
}

export default function TextAreaField({
                          disabled,
                          id,
                          label,
                          minRows = 5,
                          onChange = {},
                          required = false,
                          value,
                          style = {}
                        }: Props) {

  // Render
  return (
    <div style={style}>
      <FormControl fullWidth>
        <InputLabel
          htmlFor={id}
          required={required}
          style={{
            position: 'absolute',
            top: value ? '-18pt' : '4pt',
            left: '12px',
            fontSize: value ? '12px' : '16px',
            color: value ? '#1976d2' : '#aaa',
            transition: '0.2s ease all',
            background: value ? '#fff' : 'transparent',
            padding: '0 4px',
            pointerEvents: 'none',
          }}>
          {label}
        </InputLabel>
        <TextareaAutosize
          autoComplete='off'
          disabled={disabled}
          id={id}
          minRows={minRows}
          onChange={onChange}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
          }}
          value={value} />
      </FormControl>
    </div>
  )
}
