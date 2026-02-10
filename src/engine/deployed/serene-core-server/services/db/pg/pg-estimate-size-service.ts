export type PgRecordEstimateInput = {
  numberFields?: number[]
  booleanFields?: boolean[]
  stringFields?: string[]
  jsonFields?: any[]

  bigStringValues?: any[]
  bigJsonValues?: any[]
}

export class PgEstimateSizeService {

  // Consts
  clName = 'PgEstimateSizeService'

  // Code
  estimateRecordSize(
    records: PgRecordEstimateInput[]
  ): { totalInline: number; totalToast: number; total: number } {

    // Debug
    const fnName = `${this.clName}.estimateRecordSize()`

    // console.log(`${fnName}: starting..`)

    // Consts and initial vars
    const TOAST_THRESHOLD = 2000  // bytes
    const ROW_OVERHEAD = 24
    const TOAST_POINTER_SIZE = 20

    let totalInline = 0
    let totalToast = 0

    // Per record
    for (const record of records) {

      // Debug
      // console.log(`${fnName}: record: ` + JSON.stringify(record))

      // Start with initial rowSize
      let rowSize = ROW_OVERHEAD

      // Estimate primitive sizes
      rowSize += (record.numberFields?.length ?? 0) * 8
      rowSize += (record.booleanFields?.length ?? 0) * 1

      if (record.stringFields) {
        for (const str of record.stringFields) {
          if (str != null) {
            rowSize += Buffer.byteLength(str, 'utf8')
          }
        }
      }

      if (record.jsonFields) {
        for (const json of record.jsonFields) {
          if (json != null) {
            rowSize += Buffer.byteLength(JSON.stringify(json), 'utf8')
          }
        }
      }

      // Estimate for bigStringValues
      if (record.bigStringValues) {

        for (const bigStringValue of record.bigStringValues) {

          if (bigStringValue == null) {
            continue
          }

          const strSize = Buffer.byteLength(bigStringValue, 'utf8')

          if (strSize > TOAST_THRESHOLD) {
            rowSize += TOAST_POINTER_SIZE
            totalToast += strSize
          } else {
            rowSize += strSize
          }

          totalInline += rowSize
        }
      }

      // Estimate for bigJsonValues
      if (record.bigJsonValues) {

        for (const bigJsonValue of record.bigJsonValues) {

          if (bigJsonValue == null) {
            continue
          }

          const jsonStr = JSON.stringify(bigJsonValue)
          const jsonSize = Buffer.byteLength(jsonStr, 'utf8')

          if (jsonSize > TOAST_THRESHOLD) {
            rowSize += TOAST_POINTER_SIZE
            totalToast += jsonSize
          } else {
            rowSize += jsonSize
          }

          totalInline += rowSize
        }
      }
    }

    // Debug
    // console.log(`${fnName}: returning..`)

    // Return
    return {
      totalInline,
      totalToast,
      total: totalInline + totalToast
    }
  }
}
