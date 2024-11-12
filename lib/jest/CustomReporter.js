const fs = require('fs')
const path = require('path')

class CustomReporter {
  constructor(_globalConfig) {
    this.resultFile = path.join(process.cwd(), 'test-results.json')
    this.startTime = Date.now()
    // Clear existing results file
    fs.writeFileSync(this.resultFile, '')
  }

  onRunStart() {
    this.startTime = Date.now()
  }

  onTestResult(_test, testResult, _aggregatedResult) {
    const results = testResult.testResults.map(result => ({
      filePath: testResult.testFilePath,
      testName: result.fullName,
      status: result.status,
      duration: result.duration || 0,
      errorMessages: result.failureMessages
    }))

    this.saveResults(results)
  }

  onRunComplete(_contexts, results) {
    const duration = Date.now() - this.startTime

    const testRunResult = {
      timestamp: new Date().toISOString(),
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      duration,
      testResults: this.loadResults(),
      coverage: this.getCoverageData(results)
    }

    fs.writeFileSync(
      this.resultFile,
      JSON.stringify(testRunResult, null, 2)
    )
  }

  saveResults(results) {
    const existingResults = this.loadResults()
    const updatedResults = [...existingResults, ...results]
    fs.writeFileSync(
      this.resultFile,
      JSON.stringify(updatedResults, null, 2)
    )
  }

  loadResults() {
    try {
      const content = fs.readFileSync(this.resultFile, 'utf8')
      return content ? JSON.parse(content) : []
    } catch {
      return []
    }
  }

  getCoverageData(results) {
    if (!results.coverageMap) return undefined

    const coverage = results.coverageMap.getCoverageSummary()
    return {
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      functions: coverage.functions.pct,
      lines: coverage.lines.pct
    }
  }

  getLastError() {
    return undefined
  }
}

module.exports = CustomReporter 