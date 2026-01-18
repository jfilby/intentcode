import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { IconButton, Tooltip } from '@mui/material'

interface Props {
  text: string
  title?: string
  style?: any
}

export default function CopyTextIcon({
                          text,
                          title = 'Copy',
                          style = {}
                        }: Props) {

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  // Render
  return (
    <Tooltip
      style={style}
      title={title}>
      <IconButton onClick={(e) => handleCopy()} size='small'>
        <ContentCopyIcon fontSize='small' />
      </IconButton>
    </Tooltip>
  )
}
