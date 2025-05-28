import fs from 'fs';
import path from 'path';

interface TestResultData {
  filePath: string;
  testName: string;
  status: string;
  duration: number;
  errorMessages?: string[];
}

interface CoverageData {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface TestRunResult {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  duration: number;
  testResults: TestResultData[];
  coverage?: CoverageData;
}

class CustomReporter {
  private resultFile: string;
  private startTime: number;

  constructor(_globalConfig: unknown) {
    this.resultFile = path.join(process.cwd(), 'test-results.json');
    this.startTime = Date.now();
    // Clear existing results file
    fs.writeFileSync(this.resultFile, '');
  }

  onRunStart(): void {
    this.startTime = Date.now();
  }

  onTestResult(
    _test: unknown,
    testResult: {
      testFilePath: string;
      testResults: Array<{
        fullName: string;
        status: string;
        duration: number | null;
        failureMessages: string[];
      }>;
    },
    _aggregatedResult: unknown
  ): void {
    const results = testResult.testResults.map(result => ({
      filePath: testResult.testFilePath,
      testName: result.fullName,
      status: result.status,
      duration: result.duration || 0,
      errorMessages: result.failureMessages,
    }));

    this.saveResults(results);
  }

  onRunComplete(
    _contexts: Set<unknown>,
    results: {
      numTotalTests: number;
      numPassedTests: number;
      numFailedTests: number;
      numPendingTests: number;
      coverageMap?: {
        getCoverageSummary: () => {
          statements: { pct: number };
          branches: { pct: number };
          functions: { pct: number };
          lines: { pct: number };
        };
      };
    }
  ): void | Promise<void> {
    const duration = Date.now() - this.startTime;

    const testRunResult: TestRunResult = {
      timestamp: new Date().toISOString(),
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      duration,
      testResults: this.loadResults(),
      coverage: this.getCoverageData(results),
    };

    fs.writeFileSync(this.resultFile, JSON.stringify(testRunResult, null, 2));
  }

  private saveResults(results: TestResultData[]): void {
    const existingResults = this.loadResults();
    const updatedResults = [...existingResults, ...results];
    fs.writeFileSync(this.resultFile, JSON.stringify(updatedResults, null, 2));
  }

  private loadResults(): TestResultData[] {
    try {
      const content = fs.readFileSync(this.resultFile, 'utf8');
      return content ? JSON.parse(content) : [];
    } catch {
      return [];
    }
  }

  private getCoverageData(results: {
    coverageMap?: {
      getCoverageSummary: () => {
        statements: { pct: number };
        branches: { pct: number };
        functions: { pct: number };
        lines: { pct: number };
      };
    };
  }): CoverageData | undefined {
    if (!results.coverageMap) return undefined;

    const coverage = results.coverageMap.getCoverageSummary();
    return {
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      functions: coverage.functions.pct,
      lines: coverage.lines.pct,
    };
  }

  getLastError(): Error | undefined {
    return undefined;
  }
}

export default CustomReporter;
