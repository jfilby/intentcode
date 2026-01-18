import { Box, Button, ButtonProps, styled } from '@mui/material'
import { grey } from '@mui/material/colors'

interface Props {
  disabled?: boolean
  icon: any
  label: string | undefined
  onClick: any
  color?: string
  textColor?: string
  backgroundColor?: string
  style?: any
}

export default function LabeledIconButton({
                          disabled,
                          icon,
                          label,
                          onClick,
                          color = grey[700],
                          textColor = grey[500],
                          backgroundColor = grey[100],
                          style = {}
                        }: Props) {

  // Consts
  const Icon = icon

  const ColorButton = styled(Button)<ButtonProps>(({ theme }) => ({
    color: color,
    backgroundColor: 'transparent',
    '&:hover': {
      color: theme.palette.getContrastText(textColor),
      backgroundColor: backgroundColor,
    },
  }))

  // Render
  // Wrap in a box, so that if there's no onClick event the button isn't
  // clickable (pointerEvents set to none instead of auto).
  return (
    <Box sx={{ pointerEvents: onClick == null ? 'none' : 'auto' }}>
      <ColorButton
        disabled={disabled}
        onClick={onClick}
        variant='text'
        startIcon={<Icon />}
        style={style}>
        {label}
      </ColorButton>
    </Box>
  )
}
