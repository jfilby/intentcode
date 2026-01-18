import { useState } from 'react'
import { Box, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface Props {
  str: string
  format?: boolean
  minified?: boolean
}

export function JsonDisplay({
                  str,
                  format = false,
                  minified = false
                }: Props) {

  const [isMinified, setIsMinified] = useState(minified)

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component='pre'
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          position: 'relative',
          maxHeight: isMinified ? '5rem' : 'none',
          overflow: 'hidden',
          '&::after': isMinified ? {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2rem',
            background: 'linear-gradient(to bottom, transparent, white)',
            pointerEvents: 'none'
          } : {}
        }}>
        <SyntaxHighlighter
          style={oneLight}
          language='js'
          wrapLongLines>
          {format === true ? JSON.stringify(JSON.parse(str), null, 2) : str}
        </SyntaxHighlighter>
      </Box>

      {isMinified && (
        <IconButton
          onClick={() => setIsMinified(false)}
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            backgroundColor: 'white',
            boxShadow: 1,
            '&:hover': {
              backgroundColor: 'grey.100'
            }
          }}
          size='small'>
          <AddIcon fontSize='small' />
        </IconButton>
      )}
    </Box>
  )
}
