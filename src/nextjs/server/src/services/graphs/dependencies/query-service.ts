import { DepDeltaNames } from "@/types/server-only-types"

export class DependenciesQueryService {

  // Consts
  clName = 'DependenciesQueryService'

  // Code
  verifyDeps(deps: any[]) {

    // Verify array
    if (!Array.isArray(deps)) {
      console.log(`deps isn't an array`)
      return false
    }

    // Verify each entry
    for (const dep of deps) {

      if (dep.delta == null) {
        console.log(`dep.delta not specified`)
        return false
      }

      if (![DepDeltaNames.del,
            DepDeltaNames.set].includes(dep.delta)) {

        console.log(`dep.delta not valid`)
        return false
      }

      if (dep.name == null) {
        console.log(`dep.name not specified`)
        return false
      }

      if (dep.minVersion == null) {
        console.log(`dep.minVersion not specified`)
        return false
      }
    }

    // Verified OK
    return true
  }
}
