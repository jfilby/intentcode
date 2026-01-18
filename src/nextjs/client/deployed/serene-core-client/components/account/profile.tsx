import { signIn, signOut } from 'next-auth/react'
import { useQuery } from '@apollo/client/react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import { useEffect, useState } from 'react'
import ActionNotification from '../notifications/action'
import { RestApiService } from '../../services/rest-api/service'
import { FormControl, InputLabel, Typography } from '@mui/material'
import { countries } from '../../services/locale/countries'
import { getUserPreferencesQuery } from '../../apollo/user-preferences'
import { UserPreferencesService } from '../../services/users/user-preferences-service'
import { ProfileService } from '../../services/users/profile-service'

interface Props {
  userProfile: any
  clientUrl: string
  serverUrl: string
  session: any
}

export default function Profile({
                          userProfile,
                          clientUrl,
                          serverUrl,
                          session
                        }: Props) {

  // Consts
  const personalDetails = 'personal details'

  // State
  const [fullName, setFullName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [country, setCountry] = useState('United States')

  const [notificationSuccessText, setNotificationSuccessText] = useState('')
  const [notificationSuccessOpened, setNotificationSuccessOpened] = useState(false)
  const [notificationErrorText, setNotificationErrorText] = useState('')
  const [notificationErrorOpened, setNotificationErrorOpened] = useState(false)

  // Services
  const profileService = new ProfileService()

  // GraphQL
  const { refetch: fetchGetUserPreferencesQuery } =
    useQuery<any>(getUserPreferencesQuery, {
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
  function guessFirstNameFromFullName() {

    // Get first instance of a space
    let firstSpace = fullName.indexOf(' ')

    // The space can't be either not found or the first char, return if so.
    if (firstSpace <= 0) {
      return
    }

    setFirstName(fullName.substring(0, firstSpace))
  }

  const handleSignin = (e: any) => {
    e.preventDefault()
    signIn()
  }

  const handleSignout = (e: any) => {
    e.preventDefault()
    signOut()
  }

  async function setProfile() {

    const restApiService: RestApiService =
            new RestApiService(clientUrl,
                               serverUrl)

    restApiService.submit({
      relativeUrl: '/api/account/profile/update',
      headers: undefined,
      method: undefined,

      values: {
        // token: token,
        userProfileId: userProfile.id,
        fullName: fullName,
        firstName: firstName,
        country: country,
      },
      callbackOnSuccess: undefined,
      routeOnSuccess: undefined,
      setSubmitDisabled: undefined,
      setNotificationSuccessText: setNotificationSuccessText,
      setNotificationSuccessOpened: setNotificationSuccessOpened,
      setNotificationErrorText: setNotificationErrorText,
      setNotificationErrorOpened: setNotificationErrorOpened })
  }

  // Events

  // Get profile data on load
  useEffect(() => {

    const fetchData = async () => {

      // Get profile data
      // console.log(`fetching getUserPreferencesQuery for userProfileId: ${user.id}`)

      const results = await
              fetchGetUserPreferencesQuery({
                userProfileId: userProfile.id,
                category: personalDetails,
                keys: [
                  profileService.fullName,
                  profileService.firstName,
                  profileService.countryCode,
                ]
              })

      // Set profile data
      const keyValues = results.data['getUserPreferences']

      for (const keyValue of keyValues) {
        switch (keyValue.key) {

          case profileService.fullName: {
            setFullName(keyValue.value)
            break
          }

          case profileService.firstName: {
            setFirstName(keyValue.value)
            break
          }

          case profileService.countryCode: {
            setCountry(profileService.getCountryByCode(keyValue.value))
            break
          }
        }
      }
    }

    if (userProfile.id !== null) {
      const result = fetchData()
        .catch(console.error)
    }

  }, [userProfile.id])

  // Render
  return (
    <>
      {session ?
       <>
         <p>You're signed in: &nbsp;
          <span style={{ color: 'gray', fontWeight: '600' }}>{session.user.email}</span>
          <span style={{ marginLeft: '1em' }}>
            (<a
              href='#'
              onClick={handleSignout}
              className='btn-signin'>Sign out</a>)
          </span>
         </p>

          {/* <p>userProfile: {JSON.stringify(userProfile)}</p> */}

          <form
            onSubmit={(e) => { setProfile(); e.preventDefault(); }}
            style={{ marginTop: '2em' }} >

            <Typography
              style={{ marginBottom: '1em' }}
              variant='h6'>
              Personal details
            </Typography>

            <Typography
              style={{ marginBottom: '1em' }}
              variant='body1'>
              These fields are required and are used to personalize your
              experience.
            </Typography>

            <TextField
              autoFocus
              fullWidth
              variant='outlined'
              label='Full name'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={(e) => {
                if (fullName == null) {
                  return
                } else if (fullName.trim() === '') {
                  return
                }

                if (firstName == null) {
                  guessFirstNameFromFullName()
                } else if (firstName.trim() === '') {
                  guessFirstNameFromFullName()
                }
              }}
              required />
            <br/><br/>
            <TextField
              fullWidth
              variant='outlined'
              label='First name'
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required />
            <br/><br/>
            <FormControl fullWidth>
              <InputLabel
                htmlFor='select-country'
                required
                shrink>
                Country
              </InputLabel>
              <Select
                inputProps={{
                  id: 'select-country',
                }}
                label='Country'
                native
                onChange={(e) => setCountry(e.target.value)}
                variant='outlined'
                value={country}>
                {countries.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <br/><br/>

            <Button
              type='submit'
              variant='contained'
              style={{ marginTop: '2em' }}>
              Update
            </Button>
          </form>
          <ActionNotification
              message='Updated.'
              autoHideDuration={5000}
              notificationOpened={notificationSuccessOpened}
              setNotificationOpened={setNotificationSuccessOpened} />
          <ActionNotification
              message={notificationErrorText}
              autoHideDuration={5000}
              notificationOpened={notificationErrorOpened}
              setNotificationOpened={setNotificationErrorOpened} />
       </>
       :
       <>
         <Typography variant='body1'>
          You aren't signed in.
         </Typography>

         <a href='#' onClick={handleSignin} className='btn-signin'>Sign in</a>
       </>
      }
     </>
  )
}
