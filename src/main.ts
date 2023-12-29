import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

const BASE_RELEASE_URL =
  'https://github.com/willgeorgetaylor/junit-reducer/releases/'

// We're doing it this way so we can passthrough
// inputs without needing to extract them individually.
function enumerateInputs(): Record<string, string> {
  const inputs: Record<string, string> = {}
  for (const key in process.env) {
    if (key.startsWith('INPUT_')) {
      const inputName = key.slice('INPUT_'.length).toLowerCase()
      const inputValue = process.env[key]
      if (inputValue && inputName !== 'version') {
        inputs[inputName] = inputValue || ''
      }
    }
  }
  return inputs
}

function formatReleaseUrl(suffix: string, version: string): string {
  if (version === 'latest')
    return `${BASE_RELEASE_URL}latest/download/junit-reducer_${suffix}`
  return `${BASE_RELEASE_URL}download/${version}/junit-reducer_${suffix}`
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const version = core.getInput('version') || 'latest'

  try {
    if (process.platform === 'win32') {
      // Windows
      const reducerReleaseUrl = await tc.downloadTool(
        formatReleaseUrl('Windows_x86_64.zip', version)
      )
      const pathToCLI = await core.group(
        'Downloading Windows binary (.zip)',
        async () => {
          core.info(`Downloading from ${reducerReleaseUrl}...`)
          const path = tc.extractZip(reducerReleaseUrl)
          return path
        }
      )
      core.addPath(pathToCLI)
    } else if (process.platform === 'darwin') {
      // Mac
      const reducerReleaseUrl = await tc.downloadTool(
        formatReleaseUrl('Darwin_x86_64.tar.gz', version)
      )
      const pathToCLI = await core.group(
        'Downloading Mac binary (.tar.gz)',
        async () => {
          core.info(`Downloading from ${reducerReleaseUrl}...`)
          const path = tc.extractTar(reducerReleaseUrl)
          return path
        }
      )
      core.addPath(pathToCLI)
    } else {
      // Linux
      const reducerReleaseUrl = await tc.downloadTool(
        formatReleaseUrl('Linux_x86_64.tar.gz', version)
      )
      const pathToCLI = await core.group(
        'Downloading Linux binary (.tar.gz)',
        async () => {
          core.info(`Downloading from ${reducerReleaseUrl}...`)
          const path = tc.extractTar(reducerReleaseUrl)
          return path
        }
      )
      core.addPath(pathToCLI)
    }

    const inputs = enumerateInputs()
    const args: string[] = Object.entries(inputs).map(
      ([key, value]) => `--${key}=${value}`
    )

    core.startGroup(`Running junit-reducer with arguments: `)
    core.info(
      Object.entries(inputs)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    )
    core.endGroup()

    await exec.exec('junit-reducer', args)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
