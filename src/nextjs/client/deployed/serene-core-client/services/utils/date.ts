const { format } = require('date-fns')

export function timestampToDateTime(timestamp: number) {

  return format(new Date(timestamp * 1), 'PPPPpppp')
}
