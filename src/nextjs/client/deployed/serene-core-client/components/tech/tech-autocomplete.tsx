import Autocomplete from '@mui/material/Autocomplete'
import FormControl from '@mui/material/FormControl'
import TextField, { TextFieldVariants } from '@mui/material/TextField'

interface Tech {
  id: string
  variantName: string
}

interface Props {
  disabled?: boolean
  label: string
  onChange: any
  setValue: any
  style?: any
  value: string | null  // id
  values: Tech[]
  variant?: TextFieldVariants | undefined
}

export default function TechAutocomplete({
                          disabled = false,
                          label,
                          onChange = () => {},
                          setValue,
                          style = {},
                          value,
                          values,
                          variant = 'standard'
                        }: Props) {

  const selectedTech = values.find((tech) => tech.id === value) || null

  return (
    <FormControl fullWidth>
      <Autocomplete
        disabled={disabled}
        value={selectedTech}
        onChange={(event, newValue) => {

          // console.log(`newValue: ` + JSON.stringify(newValue))

          const newId = newValue ? newValue.id : null
          setValue(newId)

          // Call the onChange function passed in, which must take a newId
          // parameter of type string
          onChange(newId)
        }}
        options={values}
        getOptionLabel={(option) => option?.variantName ?? ''}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required
            variant={variant}
          />
        )}
        style={style}
      />
    </FormControl>
  )
}
