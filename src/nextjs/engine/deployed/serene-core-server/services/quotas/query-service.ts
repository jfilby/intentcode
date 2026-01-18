import { PrismaClient } from '@prisma/client'
import { ResourceQuotaTotalModel } from '../../models/quotas/resource-quota-total-model'
import { ResourceQuotaUsageModel } from '../../models/quotas/resource-quota-usage-model'

// Model
const resourceQuotaTotalModel = new ResourceQuotaTotalModel()
const resourceQuotaUsageModel = new ResourceQuotaUsageModel()

// Class
export class ResourceQuotasQueryService {

  // Consts
  clName = 'ResourceQuotasQueryService'

  // Functions
  async getQuotaAndUsage(
          prisma: PrismaClient,
          userProfileId: string,
          resource: string,
          day: Date,
          inCents: boolean = true) {

    // Debug
    const fnName = `${this.clName}.getQuotaAndUsage()`

    // console.log(`${fnName}: starting with day: ` + JSON.stringify(day))

    // Get active quotas
    const activeQuotas = await
            resourceQuotaTotalModel.filter(
              prisma,
              userProfileId,
              resource,
              day)

    // If no quotas, then assume usage of zero. If quotas are zero then no
    // usage should be permitted
    if (activeQuotas.length === 0) {

      return {
        hasQuota: false,
        quota: 0.0,
        usage: 0.0
      }
    }

    // Create a list of ranges
    const activeRanges = activeQuotas.map((q: any) => ({
      from: new Date(q.fromDay),
      to: new Date(q.toDay)
    }))

    // Get total quota
    var totalQuota = activeQuotas.reduce(
          (sum: number, q: any) => sum + (q.quota ?? 0), 0)

    // Get where ranges start and end
    const rangeStart = new Date(
            Math.min(...activeRanges.map((r: any) => r.from.getTime())))

    const rangeEnd = new Date(
            Math.max(...activeRanges.map((r: any) => r.to.getTime())))

    // Get usage records
    const usages = await
            resourceQuotaUsageModel.filter(
              prisma,
              userProfileId,
              resource,
              rangeStart,     // fromDay
              rangeEnd)       // toDay

    // Filter usages
    var totalUsage = usages.reduce((sum: number, usage: any) => {

      const usedOn = new Date(usage.usageDay)
      const inAnyRange = activeRanges.some((r: any) =>
        usedOn >= r.from && usedOn <= r.to
      )
      return inAnyRange ? sum + usage.amount : sum
    }, 0)

    // Adjust credit quota and usage from cents
    if (inCents === false) {

      totalQuota = totalQuota / 100
      totalUsage = totalUsage / 100
    }

    // Return
    return {
      hasQuota: true,
      quota: totalQuota,
      usage: totalUsage
    }
  }

  async isQuotaAvailable(
          prisma: PrismaClient,
          userProfileId: string,
          resource: string,
          amountInCents: number) {

    // Debug
    const fnName = `${this.clName}.isQuotaAvailable()`

    // console.log(`${fnName}: starting with amountInCents: ${amountInCents}`)

    // Get today's date
    const today = new Date()

    // Get total quota
    const results = await
            this.getQuotaAndUsage(
              prisma,
              userProfileId,
              resource,
              today,
              true)  // inCents

    /* Debug
    console.log(`${fnName}: results: ` + JSON.stringify(results))

    console.log(`${fnName}: test: usage (${results.usage}) + ` +
                `amountInCents: (${amountInCents}) > ` +
                `results.quota (${results.quota})`) */

    // Is there enough quota?
    if (results.usage + amountInCents > results.quota) {
      return false
    }

    return true
  }
}
