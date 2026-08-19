import fs from 'fs';
import path from 'path';

const RUNNER_PATH = path.resolve(__dirname, '../../scripts/run-api-suite.cjs');

describe('run-api-suite timeout guard', () => {
  it('configura timeout explicito para suites API, sem depender do default de 5s do Jest', () => {
    const source = fs.readFileSync(RUNNER_PATH, 'utf8');

    const defaultTimeoutMatch = source.match(
      /API_SUITE_TEST_TIMEOUT_MS\s*=\s*process\.env\.API_SUITE_TEST_TIMEOUT_MS\s*\|\|\s*'(\d+)'/,
    );

    expect(defaultTimeoutMatch).not.toBeNull();
    expect(Number(defaultTimeoutMatch?.[1])).toBeGreaterThanOrEqual(60_000);
    expect(source).toContain('--testTimeout=${API_SUITE_TEST_TIMEOUT_MS}');
  });
});
