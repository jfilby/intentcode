import { useMutation } from '@apollo/client/react'
import { upsertTipGotItMutation } from '../../apollo/tips'
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material'

// Component function interface
interface Props {
  name: string
  label: string
  text: string
  setFocusRef: any
  setTipVisible: any
  style: any
  userProfileId: string
}

export default function Tip({
                          name,
                          label,
                          text,
                          setFocusRef = undefined,
                          setTipVisible,
                          style = {},
                          userProfileId
                        }: Props) {

  // GraphQL
  const [sendUpsertTipGotItMutation] =
    useMutation<any>(upsertTipGotItMutation, {
      fetchPolicy: 'no-cache',
      /* onCompleted: data => {
        console.log('attributeTypeName: ' + attributeTypeName)
        console.log(data)
      },
      onError: error => {
        console.log(error)
      } */
    })

  // Functions
  async function gotIt() {

    const fetchData = async () => {

      // Get tips data
      const { data } = await
        sendUpsertTipGotItMutation({
            variables: {
              name: name,
              userProfileId: userProfileId
            }
          })

      // Set profile data
      const results = data.upsertTipGotIt
    }

    // Async call
    if (userProfileId != null) {
      const result = fetchData()
        .catch(console.error)
    }
  }

  // Render
  return (
    <div style={style}>
      <Card style={{ background: '#6495ed', padding: '0.5em' }}>
        <CardContent style={{ background: '#ffffff' }}>
          <Typography
            variant='caption'>
            {label}
          </Typography>
          <Typography
            variant='body1'>
            {text}
          </Typography>
        </CardContent>
        <CardActions style={{ background: '#ffffff' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <Button
              onClick={(e) => {
                setTipVisible(undefined)
                gotIt()

                if (setFocusRef != null) {
                  setFocusRef.current.focus()
                }
              }}>
              Got it
            </Button>
          </div>
        </CardActions>
      </Card>
    </div>
  )
}
