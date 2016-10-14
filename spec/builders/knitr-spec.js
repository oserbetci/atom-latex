/** @babel */

import helpers from '../spec-helpers'
import _ from 'lodash'
import fs from 'fs-plus'
import path from 'path'
import KnitrBuilder from '../../lib/builders/knitr'

function getRawFile (filePath) {
  return fs.readFileSync(filePath, {encoding: 'utf-8'})
}

describe('KnitrBuilder', () => {
  let builder, fixturesPath, filePath

  beforeEach(() => {
    builder = new KnitrBuilder()
    fixturesPath = helpers.cloneFixtures()
    filePath = path.join(fixturesPath, 'knitr', 'file.Rnw')
    atom.config.set('latex.engine', 'pdflatex')
    atom.config.set('latex.outputFormat', 'pdf')
  })

  describe('constructArgs', () => {
    it('produces default arguments containing expected file path', () => {
      const expectedArgs = [
        '-e "library(knitr)"',
        '-e "opts_knit$set(concordance = TRUE)"',
        `-e "knit('${filePath.replace(/\\/g, '\\\\')}')"`
      ]

      const args = builder.constructArgs(filePath)
      expect(args).toEqual(expectedArgs)
    })
  })

  describe('run', () => {
    let exitCode

    beforeEach(() => {
      atom.config.set('latex.builder', 'latexmk')
    })

    it('successfully executes knitr when given a valid R Sweave file', () => {
      waitsForPromise(() => {
        return builder.run(filePath).then(code => { exitCode = code })
      })

      runs(() => {
        const outputFilePath = path.join(fixturesPath, 'knitr', 'file.tex')

        expect(exitCode).toBe(0)
        expect(getRawFile(outputFilePath)).toContain('$\\tau \\approx 6.2831853$')
      })
    })

    it('fails to execute knitr when given an invalid file path', () => {
      filePath = path.join(fixturesPath, 'foo.Rnw')

      waitsForPromise(() => {
        return builder.run(filePath).then(code => { exitCode = code })
      })

      runs(() => {
        expect(exitCode).toBe(1)
      })
    })

    it('detects missing knitr library and logs an error', () => {
      const env = { 'R_LIBS_USER': '/dev/null', 'R_LIBS_SITE': '/dev/null' }
      const options = _.merge(builder.constructChildProcessOptions(filePath), { env })
      spyOn(builder, 'constructChildProcessOptions').andReturn(options)
      spyOn(latex.log, 'showMessage').andCallThrough()

      waitsForPromise(() => {
        return builder.run(filePath).then(code => { exitCode = code })
      })

      runs(() => {
        expect(exitCode).toBe(-1)
        expect(latex.log.showMessage).toHaveBeenCalledWith({
          type: 'Error',
          text: 'The R package "knitr" could not be loaded.'
        })
      })
    })
  })

  describe('resolveOutputPath', () => {
    let sourcePath, resultPath

    beforeEach(() => {
      sourcePath = path.resolve('/var/foo.Rnw')
      resultPath = path.resolve('/var/foo.tex')
    })

    it('detects an absolute path and returns it unchanged', () => {
      const stdout = `foo\nbar\n\n[1] "${resultPath}"`
      const resolvedPath = builder.resolveOutputPath(sourcePath, stdout)

      expect(resolvedPath).toBe(resultPath)
    })

    it('detects a relative path and makes it absolute with respect to the source file', () => {
      const stdout = `foo\nbar\n\n[1] "${path.basename(resultPath)}"`
      const resolvedPath = builder.resolveOutputPath(sourcePath, stdout)

      expect(resolvedPath).toBe(resultPath)
    })
  })
})
