import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

const BASE_RELEASE_URL =
  'https://github.com/willgeorgetaylor/junit-reducer/releases/'

type Platform = {
  os: string
  suffix: string
  extractionFunction: (path: string) => Promise<string>
}

const PLATFORMS: {
  [key: string]: Platform
} = {
  win32: {
    os: 'Windows',
    suffix: 'Windows_x86_64.zip',
    extractionFunction: tc.extractZip
  },
  darwin: {
    os: 'Mac',
    suffix: 'Darwin_x86_64.tar.gz',
    extractionFunction: tc.extractTar
  },
  linux: {
    os: 'Linux',
    suffix: 'Linux_x86_64.tar.gz',
    extractionFunction: tc.extractTar
  }
}

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

// For latest: https://github.com/willgeorgetaylor/junit-reducer/releases/latest/download/junit-reducer_Darwin_x86_64.tar.gz
// For a specific version: https://github.com/willgeorgetaylor/junit-reducer/releases/download/v1.2.0/junit-reducer_Darwin_x86_64.tar.gz
function formatReleaseUrl(suffix: string, version: string): string {
  if (version === 'latest')
    return `${BASE_RELEASE_URL}latest/download/junit-reducer_${suffix}`
  else return `${BASE_RELEASE_URL}download/${version}/junit-reducer_${suffix}`
}

function getProcessPlatform(): string {
  // This is a function so we can mock it in tests
  return process.env.OVERRIDE_PLATFORM || process.platform
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const version = core.getInput('version') || 'latest'
  const isPlatformOverride = process.env.OVERRIDE_PLATFORM !== undefined

  if (version !== 'latest' && !/^v\d+\.\d+\.\d+$/.test(version)) {
    core.setFailed(`invalid version string: ${version}`)
    return
  }

  try {
    const platform = PLATFORMS[getProcessPlatform()] || PLATFORMS.linux

    const tmp = await core.group(
      `Downloading ${platform.os} archive (${platform.suffix}})`,
      async () => {
        const url = formatReleaseUrl(platform.suffix, version)
        core.info(`Downloading from ${url}...`)
        const download = await tc.downloadTool(url)
        core.info(`${platform.os} archive downloaded`)
        return download
      }
    )

    // Only extract and install the extension if we're not
    // mocking the OS, since it'll fail anyway.
    if (isPlatformOverride) {
      core.error("Can't install extension on mocked platform")
      return
    }

    const pathToCLI = await core.group(
      `Extracting ${platform.os} binary`,
      async () => {
        core.info(`Extracting from ${tmp}`)
        const path = await platform.extractionFunction(tmp)
        core.info(`Extracted to ${path}`)
        return path
      }
    )
    core.addPath(pathToCLI)

    const inputs = enumerateInputs()
    const args: string[] = Object.entries(inputs).map(
      ([key, value]) => `--${key}=${value}`
    )

    core.startGroup(`Running junit - reducer with arguments: `)
    core.info(
      Object.entries(inputs)
        .map(([key, value]) => `${key}: ${value} `)
        .join('\n')
    )
    core.endGroup()

    const exitCode = await exec.exec('junit-reducer', args)

    if (exitCode === 0) {
      core.info('junit-reducer exited successfully')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.log(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
