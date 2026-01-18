import { useState } from 'react'
import { TextField, List, ListItem, ListItemText, IconButton, Stack } from '@mui/material'
import { Add, Check, Delete, Edit } from '@mui/icons-material'

export interface Props {
  label: string
  values: string[]
  setValues?: any
  onChange?: any
}

export default function EditableStringList({
                          label,
                          values,
                          setValues,
                          onChange
                        }: Props) {

  const [input, setInput] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const updateItems = (newItems: string[]) => {
    setValues?.(newItems)
    onChange?.(newItems)
  }

  const handleAddOrUpdate = () => {

    if (input.trim() === '') return

    if (editIndex !== null) {
      const updated = [...values]
      updated[editIndex] = input.trim()
      updateItems(updated.sort())
      setEditIndex(null)
    } else {
      updateItems([...values, input.trim()].sort())
    }

    setInput('')
  }

  const handleEdit = (index: number) => {

    setInput(values[index])
    setEditIndex(index)
  }

  const handleDelete = (index: number) => {

    setValues(values.filter((_, i) => i !== index))
    if (editIndex === index) {
      setInput('')
      setEditIndex(null)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction='row' spacing={1}>
        <TextField
          autoComplete='off'
          label={label}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          fullWidth />
        <IconButton edge='end' onClick={() => handleAddOrUpdate()}>
          {editIndex !== null ?
            <Check />
          :
            <Add />
          }
        </IconButton>
      </Stack>

      <List>
        {values.map((item, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <>
                <IconButton edge='end' onClick={() => handleEdit(index)}>
                  <Edit />
                </IconButton>
                <IconButton edge='end' onClick={() => handleDelete(index)}>
                  <Delete />
                </IconButton>
              </>
            }
          >
            <ListItemText primary={item} />
          </ListItem>
        ))}
      </List>
    </Stack>
  )
}
