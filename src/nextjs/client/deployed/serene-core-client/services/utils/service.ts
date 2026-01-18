export class UtilsService {

  getBaseUrl(url: string) {
    // Based on: https://stackoverflow.com/a/1420902

    var pathArray = url.split('/')
    var protocol = pathArray[0]
    var host = pathArray[2]

    return protocol + '//' + host
  }
}
