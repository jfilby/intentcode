export function postToServerHeaders(localClientUrl: string) {
  // Headers
  let headers = new Headers()

  headers.append('Content-Type', 'application/json')
  headers.append('Accept', 'application/json')
  headers.append('Origin', localClientUrl)

  return headers
}
