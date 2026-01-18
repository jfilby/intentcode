import { useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { getTipsByUserProfileIdAndTagsQuery } from '../../apollo/tips'

// Component function interface
interface Props {
  userProfileId: string
  tipTags: string[]
  setTips: any
}

export default function LoadTips({
                          userProfileId,
                          tipTags,
                          setTips
                        }: Props) {

  // GraphQL
  const { refetch: fetchGetTipsByUserProfileIdAndTagsQuery } =
    useQuery<any>(getTipsByUserProfileIdAndTagsQuery, {
      fetchPolicy: 'no-cache'
      /* onCompleted: data => {
        console.log('attributeTypeName: ' + attributeTypeName)
        console.log(data)
      },
      onError: error => {
        console.log(error)
      } */
    })

  // Functions
  async function getTips() {

    const fnName = `getTips()`

    // Get tips data
    const { data } = await
      fetchGetTipsByUserProfileIdAndTagsQuery({
          variables: {
            userProfileId: userProfileId,
            tags: tipTags
          }
        })

    // Set profile data
    const results = data.getTipsByUserProfileIdAndTags

    if (results != null) {
      // console.log(`${fnName}: results: ${JSON.stringify(results)}`)

      setTips(results.tips)
    }
  }

  // Effects
  useEffect(() => {

    const fetchData = async () => {
      await getTips()
    }

    // Async call
    if (userProfileId != null) {
      const result = fetchData()
        .catch(console.error)
    }

  }, [userProfileId])

  // Render
  return (
    <>
    </>
  )
}
