# junit-reducer-action

[![GitHub Super-Linter](https://github.com/willgeorgetaylor/junit-reducer-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/willgeorgetaylor/junit-reducer-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/willgeorgetaylor/junit-reducer-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/willgeorgetaylor/junit-reducer-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/willgeorgetaylor/junit-reducer-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/willgeorgetaylor/junit-reducer-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

<!-- markdownlint-disable MD013 -->

GitHub Action for compressing JUnit XML reports into an averaged set

## Inputs

All inputs are optional. However, these are the most important:

| Name | Description | Type | Default |
| :---  | :--- | :--- | :--- |
| `include` | Glob pattern to find input JUnit XML reports | `string` | `./**/*.xml` |
| `output-path` | Output path for synthetic JUnit XML reports | `string` | `./output/` |
| `exclude` | Glob pattern to exclude from input JUnit XML reports | `string` |  |
| `version` | Version of [junit-reducer](https://github.com/willgeorgetaylor/junit-reducer/releases) CLI to use (e.g., `v1.0.0` or `latest`) | `string` | `latest` |

### Additional inputs

| Name | Description | Type | Default |
| :---  | :--- | :--- | :--- |
| `op-suites-time` | Operation for test suites time. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `op-cases-time` | Operation for test cases time. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `op-suites-assertions` | Operation for test suites assertions. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `op-suites-errors` | Operation for test suites errors. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `op-suites-failures` | Operation for test suites failures. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `op-suites-skipped` | Operation for test suites skipped. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `op-suites-tests` | Operation for test suites tests. Options: `max`, `mean`, `median`, `min`, `mode` or `sum` | `string` | `mean` |
| `reduce-suites-by` | Operation for test suites tests. Options: `filepath`, `name` or `name+filepath` | `string` | `name+filepath` |
| `reduce-cases-by` | Reduce test cases by name, classname, or file. Options: `classname`, `file` or `name` | `string` | `name` |
| `rounding-mode` | Rounding mode for counts that should be integers. Options: `ceil`, `floor` or `round` | `string` | `round` |

## Example Workflow

```yaml
name: junit-test-report-averaging
run-name: Create Average JUnit Test Reports
on:
  schedule:
      # Run every morning at 8AM
      - cron:  '0 8 * * *'
jobs:
  reduce-reports:
    runs-on: ubuntu-latest
    steps:
      # Configure with the Cloud storage provider of your choice.
      - name: Setup AWS CLI
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.YOUR_AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.YOUR_AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-2

      # Download all test reports from all CI runs.
      # It is recommended to set up a lifecycle rule, to remove objects older
      # than a certain age from this bucket/path. This will help to keep the test reports
      # current and keep this job from taking too long.
      - name: Download test timings
        run: |
          aws s3 cp s3://your-junit-report-bucket/ci-runs-reports/ reports/ \
            --recursive

      - name: Reduce reports
        uses: willgeorgetaylor/junit-reducer-action
        with:
          include: ./reports/**/*
          output-path: ./average-reports/

      # Upload the reduced set of test reports to a dedicated bucket/path.
      # In your actual CI process, the CI runners will copy the contents of
      # this path locally, to be ingested by the test splitter.
      - name: Upload single set of averaged reports
        run: |
          aws s3 sync ./average-reports s3://your-junit-report-bucket/average-reports/ \
            --size-only \
            --cache-control max-age=86400
```

## Dependencies

This action invokes [willgeorgetaylor/junit-reducer](https://github.com/willgeorgetaylor/junit-reducer) to reduce the test reports.

If you prefer to use the command-line tool directly, there are instructions for that on the [repository readme](https://github.com/willgeorgetaylor/junit-reducer?tab=readme-ov-file#github-actions).
