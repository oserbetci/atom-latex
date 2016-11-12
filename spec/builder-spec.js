/** @babel */

import helpers from './spec-helpers'
import path from 'path'
import Builder from '../lib/builder'
import BuildState from '../lib/build-state'

describe('Builder', () => {
  let builder, fixturesPath, filePath, logFilePath, fdbFilePath, state

  beforeEach(() => {
    builder = new Builder()
    fixturesPath = helpers.cloneFixtures()
    filePath = path.join(fixturesPath, 'file.tex')
    logFilePath = path.join(fixturesPath, 'file.log')
    fdbFilePath = path.join(fixturesPath, 'file.fdb_latexmk')
    state = new BuildState(filePath)
    state.outputDirectory = ''
  })

  describe('constructPath', () => {
    it('reads `latex.texPath` as configured', () => {
      spyOn(atom.config, 'get').andReturn()
      builder.constructPath()

      expect(atom.config.get).toHaveBeenCalledWith('latex.texPath')
    })

    it('uses platform default when `latex.texPath` is not configured', () => {
      const defaultTexPath = '/foo/bar'
      const expectedPath = [defaultTexPath, process.env.PATH].join(path.delimiter)
      atom.config.set('latex.texPath', '')
      spyOn(builder, 'defaultTexPath').andReturn(defaultTexPath)

      const constructedPath = builder.constructPath()
      expect(constructedPath).toBe(expectedPath)
    })

    it('replaces surrounded $PATH with process.env.PATH', () => {
      const texPath = '/foo:$PATH:/bar'
      const expectedPath = texPath.replace('$PATH', process.env.PATH)
      atom.config.set('latex.texPath', texPath)

      const constructedPath = builder.constructPath()
      expect(constructedPath).toBe(expectedPath)
    })

    it('replaces leading $PATH with process.env.PATH', () => {
      const texPath = '$PATH:/bar'
      const expectedPath = texPath.replace('$PATH', process.env.PATH)
      atom.config.set('latex.texPath', texPath)

      const constructedPath = builder.constructPath()
      expect(constructedPath).toBe(expectedPath)
    })

    it('replaces trailing $PATH with process.env.PATH', () => {
      const texPath = '/foo:$PATH'
      const expectedPath = texPath.replace('$PATH', process.env.PATH)
      atom.config.set('latex.texPath', texPath)

      const constructedPath = builder.constructPath()
      expect(constructedPath).toBe(expectedPath)
    })

    it('prepends process.env.PATH with texPath', () => {
      const texPath = '/foo'
      const expectedPath = [texPath, process.env.PATH].join(path.delimiter)
      atom.config.set('latex.texPath', texPath)

      const constructedPath = builder.constructPath()
      expect(constructedPath).toBe(expectedPath)
    })
  })

  describe('parseLogFile', () => {
    let logParser

    beforeEach(() => {
      logParser = jasmine.createSpyObj('MockLogParser', ['parse'])
      spyOn(builder, 'getLogParser').andReturn(logParser)
    })

    it('resolves the associated log file path by invoking @resolveLogFilePath', () => {
      spyOn(builder, 'resolveLogFilePath').andReturn('foo.log')

      builder.parseLogFile(state)
      expect(builder.resolveLogFilePath).toHaveBeenCalledWith(state)
    })

    it('returns null if passed a file path that does not exist', () => {
      state.filePath = '/foo/bar/quux.tex'
      const result = builder.parseLogFile(state)

      expect(result).toBeNull()
      expect(logParser.parse).not.toHaveBeenCalled()
    })

    it('attempts to parse the resolved log file', () => {
      builder.parseLogFile(state)

      expect(builder.getLogParser).toHaveBeenCalledWith(logFilePath, filePath)
      expect(logParser.parse).toHaveBeenCalled()
    })
  })

  describe('parseFdbFile', () => {
    let fdbParser

    beforeEach(() => {
      fdbParser = jasmine.createSpyObj('MockFdbParser', ['parse'])
      spyOn(builder, 'getFdbParser').andReturn(fdbParser)
    })

    it('resolves the associated fdb file path by invoking @resolveFdbFilePath', () => {
      spyOn(builder, 'resolveFdbFilePath').andReturn('foo.fdb_latexmk')

      builder.parseFdbFile(state)
      expect(builder.resolveFdbFilePath).toHaveBeenCalledWith(state)
    })

    it('returns null if passed a file path that does not exist', () => {
      state.filePath = '/foo/bar/quux.tex'
      const result = builder.parseFdbFile(state)

      expect(result).toBeNull()
      expect(fdbParser.parse).not.toHaveBeenCalled()
    })

    it('attempts to parse the resolved fdb file', () => {
      builder.parseFdbFile(state)

      expect(builder.getFdbParser).toHaveBeenCalledWith(fdbFilePath)
      expect(fdbParser.parse).toHaveBeenCalled()
    })
  })

  describe('parseLogAndFdbFiles', () => {
    it('verifies that the correct output file is selected when using various latexmk modes', () => {
      const switches = [{
        name: 'pdf',
        format: 'pdf'
      }, {
        name: 'pdfdvi',
        format: 'pdf'
      }, {
        name: 'pdfps',
        format: 'pdf'
      }, {
        name: 'ps',
        format: 'ps'
      }, {
        name: 'dvi',
        format: 'dvi'
      }]

      spyOn(builder, 'getOutputDirectory').andReturn('log-parse')
      for (const { name, format } of switches) {
        const result = builder.parseLogAndFdbFiles(fixturesPath, filePath, `file-${name}`)
        expect(path.basename(result.outputFilePath)).toBe(`file-${name}.${format}`, `Select ${format} file when using -${name} switch.`)
      }
    })
  })
})
