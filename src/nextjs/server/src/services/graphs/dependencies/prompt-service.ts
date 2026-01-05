export class DependenciesPromptService {

  // Consts
  clName = 'DependenciesPromptService'

  // Code
  getAddDepsPrompting() {

    const prompting =
      `## Dependencies\n` +
      `\n` +
      `Add or remove any dependencies using the deps field, but only after ` +
      `considering existing dependencies.\n` +
      `\n`

    return prompting
  }
}
