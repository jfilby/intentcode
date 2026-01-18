import { useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { getTechsQuery } from '../../apollo/techs'

interface Props {
  userProfileId: string
  resource: string,
  setTechs: any
}

export default function LoadTechByFilter({
                          userProfileId,
                          resource,
                          setTechs
                        }: Props) {

  // GraphQL
  const { refetch: fetchTechsQuery } =
    useQuery<any>(getTechsQuery, {
      fetchPolicy: 'no-cache'
      /* onCompleted: data => {
        console.log('elementName: ' + elementName)
        console.log(data)
      },
      onError: error => {
        console.log(error)
      } */
    })

  // Functions
  async function getTechsList() {

    // Debug
    const fnName = `getTechsList()`

    // Query
    const { data } = await
            fetchTechsQuery({
              userProfileId: userProfileId,
              resource: resource
            })

    // Set results
    const results = data.getTechs

    setTechs(results)
  }

  // Effects
  useEffect(() => {

    const fetchData = async () => {
      await getTechsList()
    }

    // Async call
    const result = fetchData()
      .catch(console.error)

  }, [])

  // Render
  return (
    <></>
  )
}
