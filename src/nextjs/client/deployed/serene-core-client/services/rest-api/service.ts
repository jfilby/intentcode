import { Dispatch, SetStateAction } from 'react'
import router from 'next/router'
import { postToServerHeaders } from './request'
import { UtilsService } from '../utils/service'

interface SubmitProps {
  relativeUrl: string
  headers: Headers | undefined
  values: any
  method: string | undefined
  callbackOnSuccess: any
  routeOnSuccess: string | undefined
  setSubmitDisabled: any
  setNotificationSuccessText: any
  setNotificationSuccessOpened: any
  setNotificationErrorText: any
  setNotificationErrorOpened: any
}

export class RestApiService {

  // localClientUrl: e.g. http://localhost:3001 (irrespective of the domain name)
  localClientUrl: string
  serverUrl: string

  constructor(localClientUrl: string,
              serverUrl: string) {

    this.localClientUrl = localClientUrl
    this.serverUrl = serverUrl
  }

  async getText(relativeUrl: string) {

    // Headers
    let headers = new Headers()

    headers.append('Origin', this.localClientUrl)

    return await fetch(`${this.serverUrl}${relativeUrl}`, {
      headers: headers,
    })
  }

  async submit({
          relativeUrl,
          headers = postToServerHeaders(this.localClientUrl),
          values,
          method = 'POST',
          callbackOnSuccess = undefined as any,
          routeOnSuccess = undefined,
          setSubmitDisabled = null as any,
          setNotificationSuccessText = null as Dispatch<SetStateAction<string>> | null,
          setNotificationSuccessOpened = null as Dispatch<SetStateAction<boolean>> | null,
          setNotificationErrorText = null as Dispatch<SetStateAction<string>> | null,
          setNotificationErrorOpened = null as Dispatch<SetStateAction<boolean>> | null }: SubmitProps) {

    // console.log('submitting..')

    // Submit feedback
    const res = await fetch(`${this.serverUrl}${relativeUrl}`, {
      body: JSON.stringify(values),
      headers: headers,
      method: method,
    })

    // console.log(`res.status: ${res.status}`)

    if (setSubmitDisabled) {
      setSubmitDisabled(true)
    }

    // Notification
    if (res.status === 200) {
      const result = await res.json()

      // console.log(`result: ${JSON.stringify(result)}`)

      if (result.status === true) {

        if (setNotificationSuccessText !== null &&
            setNotificationSuccessOpened !== null) {
          setNotificationSuccessText(result.msg)
          setNotificationSuccessOpened(true)
        }

        // callbackOnSuccess
        if (callbackOnSuccess &&
            callbackOnSuccess !== null) {
          callbackOnSuccess()
        }

        // routeOnSuccess
        if (routeOnSuccess &&
            routeOnSuccess !== null) {
          const utilsService: UtilsService = new UtilsService()
          const baseUrl = utilsService.getBaseUrl(window.location.href)

          router.push(`${baseUrl}${routeOnSuccess}`)
        }
      } else {

        if (setNotificationErrorText !== null &&
            setNotificationErrorOpened !== null) {
          setNotificationErrorText(result.msg)
          setNotificationErrorOpened(true)
        }

        if (setSubmitDisabled) {
          setSubmitDisabled(false)
        }
      }

      return true
    } else {
      if (setNotificationErrorText !== null &&
          setNotificationErrorOpened !== null) {
        setNotificationErrorText('Can\'t communicate with server')
        setNotificationErrorOpened(true)
      }

      if (setSubmitDisabled) {
        setSubmitDisabled(false)
      }
    }

    return false
  }

}
