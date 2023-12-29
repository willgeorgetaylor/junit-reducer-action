/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'
import { existsSync, unlinkSync } from 'fs'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let infoMock: jest.SpyInstance
let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RUNNER_TEMP = '/tmp'
    infoMock = jest.spyOn(core, 'info').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  it('successfully completes', async () => {
    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenLastCalledWith(
      'junit-reducer exited successfully'
    )
  })

  describe('with inputs', () => {
    beforeEach(() => {
      process.env['INPUT_include'] = './__tests__/fixtures/*.xml'
      process.env['INPUT_output-path'] = './__tests__/outputs'
      if (existsSync('./__tests__/outputs/Sample.xml')) {
        unlinkSync('./__tests__/outputs/Sample.xml')
      }
    })
    it('successfully outputs reduced reports', async () => {
      await main.run()
      expect(runMock).toHaveReturned()
      expect(errorMock).not.toHaveBeenCalled()
      expect(setFailedMock).not.toHaveBeenCalled()
      expect(infoMock).toHaveBeenLastCalledWith(
        'junit-reducer exited successfully'
      )
      // Expect that file exists there
      expect(existsSync('./__tests__/outputs/Sample.xml')).toBe(true)
    })
    afterEach(() => {
      delete process.env.INPUT_include
      delete process.env.INPUT_output
    })
  })

  it('successfully completes with a specific version', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'version':
          return 'v1.2.0'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenLastCalledWith(
      'junit-reducer exited successfully'
    )
  })

  describe('on mock Windows', () => {
    beforeEach(() => {
      process.env.OVERRIDE_PLATFORM = 'win32'
    })
    it('successfully downloads the Windows binary', async () => {
      await main.run()
      expect(runMock).toHaveReturned()
      expect(infoMock).toHaveBeenCalledWith('Windows archive downloaded')
      expect(errorMock).toHaveBeenCalledWith(
        "Can't install extension on mocked platform"
      )
    })
    afterEach(() => {
      delete process.env.OVERRIDE_PLATFORM
    })
  })

  describe('on mock Mac', () => {
    beforeEach(() => {
      process.env.OVERRIDE_PLATFORM = 'darwin'
    })
    it('successfully downloads the Mac binary', async () => {
      await main.run()
      expect(runMock).toHaveReturned()
      expect(infoMock).toHaveBeenCalledWith('Mac archive downloaded')
      expect(errorMock).toHaveBeenCalledWith(
        "Can't install extension on mocked platform"
      )
    })
    afterEach(() => {
      delete process.env.OVERRIDE_PLATFORM
    })
  })

  describe('on mock Linux', () => {
    beforeEach(() => {
      process.env.OVERRIDE_PLATFORM = 'linux'
    })
    it('successfully downloads the Linux binary', async () => {
      await main.run()
      expect(runMock).toHaveReturned()
      expect(infoMock).toHaveBeenCalledWith('Linux archive downloaded')
      expect(errorMock).toHaveBeenCalledWith(
        "Can't install extension on mocked platform"
      )
    })
    afterEach(() => {
      delete process.env.OVERRIDE_PLATFORM
    })
  })

  describe('on any other platform', () => {
    beforeEach(() => {
      process.env.OVERRIDE_PLATFORM = 'unknown'
    })
    it('successfully downloads the Linux binary', async () => {
      await main.run()
      expect(runMock).toHaveReturned()
      expect(infoMock).toHaveBeenCalledWith('Linux archive downloaded')
      expect(errorMock).toHaveBeenCalledWith(
        "Can't install extension on mocked platform"
      )
    })
    afterEach(() => {
      delete process.env.OVERRIDE_PLATFORM
    })
  })

  it('sets a failed status for invalid version', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'version':
          return 'this is not a number'
        default:
          return ''
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      'invalid version string: this is not a number'
    )
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('sets a failed status for non-zero status code thrown by the binary', async () => {
    // Set input variable 'include' to a non-existent file glob
    process.env.INPUT_include = 'this-file-does-not-exist.xml'

    await main.run()
    expect(runMock).toHaveReturned()
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalled()
  })
})
