/**
 * What is wrong with a project, checked without changing it.
 *
 * Every check here reports. The engine is a record of what a project holds and
 * what was asked of it, and a check that repaired what it found would make the
 * record indistinguishable from the repair — a file that had drifted would
 * simply stop being reported, with nothing to show that it had once been
 * wrong.
 */

import chalk from 'chalk'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { BuildData } from '@/types/build-types.js'
import { Emoticons } from '@/types/server-only-types.js'
import { DepsVerifyService } from '../managed-files/deps/verify-service.js'
import { TechStackVerifyService } from '../intentcode/tech-stack/verify-service.js'
import { DriftService } from './drift-service.js'

// Services
const depsVerifyService = new DepsVerifyService()
const driftService = new DriftService()
const techStackVerifyService = new TechStackVerifyService()

// Class
export class ProjectVerifyService {

  // Consts
  clName = 'ProjectVerifyService'

  // Code
  async run(
    store: ProjectStore,
    buildData: BuildData,
    projectNode: SourceNodeRecord) {

    // Verify depsNode
    await depsVerifyService.verifyDepsNode(
      store,
      projectNode)

    // Verify tech-stack.md
    await techStackVerifyService.verify(
      store,
      buildData,
      projectNode)

    // Verify that the source still answers to the Intent
    await this.verifyDrift(store, buildData, projectNode)
  }

  /**
   * The source against the Intent, reported rather than repaired: an intent
   * that has changed, or a source that has been edited behind the graph's
   * back, is something a session has to decide about.
   */
  async verifyDrift(
    store: ProjectStore,
    buildData: BuildData,
    projectNode: SourceNodeRecord) {

    const findings = await driftService.getDrift(
      store,
      buildData,
      projectNode)

    // In step
    if (findings.length === 0) return

    console.log(``)
    console.log(chalk.bold(`${Emoticons.cross} drift: ` +
      `${findings.length} file(s) out of step with their Intent`))

    for (const finding of findings) {

      console.log(`  ${finding.sourceRelativePath}: ` +
                  `${finding.kind} — ${finding.detail}`)
    }
  }
}
