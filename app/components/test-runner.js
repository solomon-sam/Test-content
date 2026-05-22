/**
 * Test Runner — Phase 4
 * Vanilla JS test framework for unit and integration testing.
 * No dependencies, browser-only, runs in a separate test.html page.
 */

class TestRunner {
  constructor(options = {}) {
    this.tests = [];
    this.results = [];
    this.beforeEachFns = [];
    this.afterEachFns = [];
    this.beforeAllFns = [];
    this.afterAllFns = [];
    this.currentSuite = null;
    this.verbose = options.verbose !== false;
    this.stopOnFail = options.stopOnFail || false;
    this.timeout = options.timeout || 5000;
  }

  /**
   * Register a test
   */
  test(name, fn) {
    this.tests.push({
      name,
      fn,
      suite: this.currentSuite,
      type: 'test'
    });
  }

  /**
   * Register a suite
   */
  describe(name, fn) {
    const previousSuite = this.currentSuite;
    this.currentSuite = name;
    fn();
    this.currentSuite = previousSuite;
  }

  /**
   * Register beforeEach hook
   */
  beforeEach(fn) {
    this.beforeEachFns.push({ fn, suite: this.currentSuite });
  }

  /**
   * Register afterEach hook
   */
  afterEach(fn) {
    this.afterEachFns.push({ fn, suite: this.currentSuite });
  }

  /**
   * Register beforeAll hook
   */
  beforeAll(fn) {
    this.beforeAllFns.push({ fn, suite: this.currentSuite });
  }

  /**
   * Register afterAll hook
   */
  afterAll(fn) {
    this.afterAllFns.push({ fn, suite: this.currentSuite });
  }

  /**
   * Assertion helpers
   */
  static assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new TestAssertionError(message);
    }
  }

  static assertEquals(actual, expected, message = null) {
    if (actual !== expected) {
      throw new TestAssertionError(
        message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  }

  static assertApprox(actual, expected, tolerance = 0.001, message = null) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new TestAssertionError(
        message || `Expected ~${expected} (±${tolerance}), got ${actual}`
      );
    }
  }

  static assertTrue(value, message = null) {
    if (value !== true) {
      throw new TestAssertionError(message || `Expected true, got ${JSON.stringify(value)}`);
    }
  }

  static assertFalse(value, message = null) {
    if (value !== false) {
      throw new TestAssertionError(message || `Expected false, got ${JSON.stringify(value)}`);
    }
  }

  static assertNull(value, message = null) {
    if (value !== null) {
      throw new TestAssertionError(message || `Expected null, got ${JSON.stringify(value)}`);
    }
  }

  static assertNotNull(value, message = null) {
    if (value === null || value === undefined) {
      throw new TestAssertionError(message || `Expected non-null value`);
    }
  }

  static assertThrows(fn, expectedError = null, message = null) {
    let threw = false;
    let actualError = null;
    try {
      fn();
    } catch (e) {
      threw = true;
      actualError = e;
    }
    if (!threw) {
      throw new TestAssertionError(message || `Expected function to throw`);
    }
    if (expectedError && !(actualError instanceof expectedError)) {
      throw new TestAssertionError(
        message || `Expected ${expectedError.name}, got ${actualError.constructor.name}`
      );
    }
  }

  static assertArrayEquals(actual, expected, message = null) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      throw new TestAssertionError(message || 'Both values must be arrays');
    }
    if (actual.length !== expected.length) {
      throw new TestAssertionError(
        message || `Array lengths differ: ${actual.length} vs ${expected.length}`
      );
    }
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) {
        throw new TestAssertionError(
          message || `Arrays differ at index ${i}: ${JSON.stringify(actual[i])} vs ${JSON.stringify(expected[i])}`
        );
      }
    }
  }

  static assertObjectEquals(actual, expected, message = null) {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw new TestAssertionError(
        message || `Object keys differ: ${JSON.stringify(actualKeys)} vs ${JSON.stringify(expectedKeys)}`
      );
    }
    for (const key of actualKeys) {
      if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
        throw new TestAssertionError(
          message || `Objects differ at key "${key}": ${JSON.stringify(actual[key])} vs ${JSON.stringify(expected[key])}`
        );
      }
    }
  }

  static assertInRange(value, min, max, message = null) {
    if (value < min || value > max) {
      throw new TestAssertionError(
        message || `Expected ${value} to be in range [${min}, ${max}]`
      );
    }
  }

  static assertType(value, expectedType, message = null) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      throw new TestAssertionError(
        message || `Expected type "${expectedType}", got "${actualType}"`
      );
    }
  }

  static assertInstance(value, expectedClass, message = null) {
    if (!(value instanceof expectedClass)) {
      throw new TestAssertionError(
        message || `Expected instance of ${expectedClass.name}`
      );
    }
  }

  static assertContains(haystack, needle, message = null) {
    const contains = typeof haystack === 'string'
      ? haystack.includes(needle)
      : Array.isArray(haystack) && haystack.includes(needle);
    if (!contains) {
      throw new TestAssertionError(
        message || `Expected to contain "${needle}"`
      );
    }
  }

  static async assertResolves(promise, message = null) {
    try {
      await promise;
    } catch (e) {
      throw new TestAssertionError(
        message || `Expected promise to resolve, but rejected: ${e.message}`
      );
    }
  }

  static async assertRejects(promise, expectedError = null, message = null) {
    let resolved = false;
    try {
      await promise;
      resolved = true;
    } catch (e) {
      if (expectedError && !(e instanceof expectedError)) {
        throw new TestAssertionError(
          message || `Expected rejection with ${expectedError.name}, got ${e.constructor.name}`
        );
      }
      return; // Expected rejection
    }
    if (resolved) {
      throw new TestAssertionError(message || 'Expected promise to reject, but resolved');
    }
  }

  /**
   * Run all tests
   */
  async run() {
    this.results = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Run beforeAll hooks
    for (const hook of this.beforeAllFns) {
      try {
        await hook.fn();
      } catch (e) {
        console.error(`beforeAll failed in ${hook.suite || 'global'}:`, e);
      }
    }

    // Run tests
    for (const test of this.tests) {
      if (test.type === 'test') {
        const result = await this.runTest(test);
        this.results.push(result);

        if (result.status === 'passed') passed++;
        else if (result.status === 'failed') failed++;
        else skipped++;

        if (this.stopOnFail && result.status === 'failed') {
          break;
        }
      }
    }

    // Run afterAll hooks
    for (const hook of this.afterAllFns) {
      try {
        await hook.fn();
      } catch (e) {
        console.error(`afterAll failed in ${hook.suite || 'global'}:`, e);
      }
    }

    return {
      total: this.tests.filter(t => t.type === 'test').length,
      passed,
      failed,
      skipped,
      results: this.results,
      duration: this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    };
  }

  /**
   * Run a single test
   */
  async runTest(test) {
    const startTime = performance.now();
    const result = {
      name: test.name,
      suite: test.suite,
      status: 'pending',
      duration: 0,
      error: null
    };

    // Run beforeEach hooks for this suite
    const relevantBefore = this.beforeEachFns.filter(h => 
      !h.suite || h.suite === test.suite || test.suite?.startsWith(h.suite)
    );
    for (const hook of relevantBefore) {
      try {
        await hook.fn();
      } catch (e) {
        console.warn(`beforeEach failed:`, e);
      }
    }

    // Run test with timeout
    try {
      await this.runWithTimeout(test.fn, this.timeout);
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    result.duration = performance.now() - startTime;

    // Run afterEach hooks
    const relevantAfter = this.afterEachFns.filter(h => 
      !h.suite || h.suite === test.suite || test.suite?.startsWith(h.suite)
    );
    for (const hook of relevantAfter) {
      try {
        await hook.fn();
      } catch (e) {
        console.warn(`afterEach failed:`, e);
      }
    }

    return result;
  }

  /**
   * Run function with timeout
   */
  runWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TestAssertionError(`Test timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn()).then(
        () => {
          clearTimeout(timer);
          resolve();
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const duration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>KPMG BCE Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f5f8fc; }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,51,141,0.08); }
    h1 { color: #00338D; margin: 0 0 8px; font-size: 24px; }
    .summary { display: flex; gap: 24px; margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: 700; font-family: monospace; }
    .stat-label { font-size: 12px; color: #5A6B8A; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat.pass .stat-value { color: #22c55e; }
    .stat.fail .stat-value { color: #ef4444; }
    .stat.total .stat-value { color: #00338D; }
    .test-list { margin-top: 24px; }
    .suite-header { font-size: 14px; font-weight: 700; color: #1A2B4A; margin: 20px 0 8px; padding-bottom: 8px; border-bottom: 1px solid #e8ecf4; }
    .test-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; margin-bottom: 4px; }
    .test-item:hover { background: #f8fafc; }
    .test-status { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .test-status.pass { background: #E8F5E9; color: #2E7D32; }
    .test-status.fail { background: #FFEBEE; color: #C62828; }
    .test-name { font-size: 13px; color: #1A2B4A; flex: 1; }
    .test-duration { font-size: 11px; color: #8A9AB0; font-family: monospace; }
    .test-error { margin: 8px 0 8px 36px; padding: 10px 14px; background: #FFEBEE; border-radius: 6px; font-size: 12px; color: #C62828; font-family: monospace; white-space: pre-wrap; }
    .timestamp { font-size: 12px; color: #8A9AB0; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 KPMG Brand Composition Engine — Test Report</h1>
    <div class="summary">
      <div class="stat total"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
      <div class="stat pass"><div class="stat-value">${passed}</div><div class="stat-label">Passed</div></div>
      <div class="stat fail"><div class="stat-value">${failed}</div><div class="stat-label">Failed</div></div>
      <div class="stat"><div class="stat-value">${(duration).toFixed(0)}ms</div><div class="stat-label">Duration</div></div>
    </div>
    <div class="test-list">
`;

    // Group by suite
    const suites = {};
    for (const result of this.results) {
      const suite = result.suite || 'Global';
      if (!suites[suite]) suites[suite] = [];
      suites[suite].push(result);
    }

    for (const [suiteName, tests] of Object.entries(suites)) {
      html += `<div class="suite-header">${suiteName}</div>`;
      for (const test of tests) {
        const statusClass = test.status === 'passed' ? 'pass' : 'fail';
        const statusIcon = test.status === 'passed' ? '✓' : '✕';
        html += `
      <div class="test-item">
        <div class="test-status ${statusClass}">${statusIcon}</div>
        <div class="test-name">${test.name}</div>
        <div class="test-duration">${test.duration.toFixed(0)}ms</div>
      </div>`;
        if (test.error) {
          html += `<div class="test-error">${test.error.message}
${test.error.stack || ''}</div>`;
        }
      }
    }

    html += `
    </div>
    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Export report to file
   */
  downloadReport(filename = 'test-report.html') {
    const html = this.generateHTMLReport();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Custom assertion error
 */
class TestAssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TestAssertionError';
  }
}

// Make available globally
window.TestRunner = TestRunner;
window.TestAssertionError = TestAssertionError;
