# Event Integration E2E handoff — resume here

This branch adds/verifies Playwright e2e coverage for the Event Integration
triggers in the WSO2 Integrator low-code editor, on top of Lakshan's
schema-driven-triggers migration branch. Work was done overnight on one
machine and is being handed off to continue on another. This file is
self-contained — you should not need any other context to resume.

## Branch info

- Branch: `test/rabbitmq-listener-paths-e2e`
- Pushed to: `origin` (`github.com/gayaldassanayake/ballerina-vscode`) — full
  history included, so a plain `git fetch origin && git checkout
  test/rabbitmq-listener-paths-e2e` is enough; you do not need Lakshan's fork
  as a remote.
- Base: Lakshan Weerasinghe's `migrate-l2-v1-backup` branch
  (`github.com/LakshanWeerasinghe/ballerina-vscode`) — this branch changes
  *how artifacts are loaded* (schema-driven trigger models instead of static
  JSON files under `trigger-models/`), which is why some previously-written
  specs needed live re-verification rather than being trusted as-is.
- All work happens under `packages/ballerina-extension/e2e-test/`.

## What's done and verified

- **RabbitMQ** (`event-integration/rabbitmq.spec.ts`) — fully verified live.
  All 3 listener-creation paths (fresh listener, reuse existing listener, new
  listener alongside an existing one) pass. 6 passed, 2 skipped (pre-existing,
  documented: Editing is flaky/tracked as issue #2188; Delete hits a
  documented product bug). Nothing left to do here.
- **MQTT** (`event-integration/mqtt.spec.ts`) — Create + Add onMessage
  Handler verified live, pass cleanly. **Found a real, pre-existing, unrelated
  bug**: the "Editing MQTT Integration" test fails consistently (not
  flaky — same failure every attempt) because
  `artifactWebView.getByRole('button', { name: 'Configure' })` never becomes
  visible. This is untouched code, not caused by anything from tonight — flag
  it separately, it's not blocking this branch's scope. Delete never got to
  run because the serial test block halts after Editing fails.

## What's done but needs live re-verification

- **Azure / ASB** (`event-integration/azure.spec.ts`) — Create and the
  pre-existing Editing test pass live. While verifying **Add onMessage
  Handler**, found and fixed a real bug in the shared handler-add helper (see
  below) via live investigation with the authoring daemon. The fix is
  committed but a clean end-to-end re-run (onMessage → onError → Delete) was
  never completed because the environment died (see "Known environment
  issue" below) right after the fix landed. **Do this first when you resume.**

  The bug: `addEventHandler()` in `event-integration/eventIntegrationUtils.ts`
  used to treat "the side panel became visible once" as proof a handler needs
  the Save/config flow. Azure's onMessage handler briefly flashes that panel
  and then closes it *on its own* (no configuration actually needed, despite
  having a DATA_BINDING-shaped parameter that looked like it would need one —
  confirmed by inspecting the generated `main.bal`, which already had
  `onMessage` added with no Save click at all). The old code kept waiting for
  a Save button that was never coming and timed out. Fixed in commit
  `1b01abf9ce` by racing "handler already added" against "panel genuinely
  settled (still visible half a second after first spotted)" instead of
  trusting the first sighting. This helper is shared by every spec below, so
  the fix should also matter for their own "Add ... Handler" tests, not just
  Azure's.

## What's written but has NEVER been live-verified (code-reviewed only)

All of these are new spec files, structurally consistent with the
already-proven RabbitMQ/MQTT/Azure patterns, and all use the now-fixed
`addEventHandler()` for their handler-add test. None have run against a live
VS Code even once — the environment died shortly after they were written.

- `event-integration/solace.spec.ts`
- `event-integration/solace.jms.spec.ts`
- `event-integration/sqs.spec.ts`
- `event-integration/mysql-cdc.spec.ts`
- `event-integration/postgresql-cdc.spec.ts`
- `event-integration/mssql-cdc.spec.ts` — **riskiest guess in the whole
  branch**: the required `databases` field is a TEXT_SET (min 1 item), filled
  via `cmEditor` + expression-mode with a Ballerina array literal
  `["orderdb"]`. No other spec on this branch has proven a TEXT_SET field can
  be filled this way — this is a guess on top of a guess. Check this one
  first if you only have time to check one.
- `event-integration/oracledb-cdc.spec.ts`

Each file's header comment documents its own specific assumptions/guesses in
detail — read those before touching the file.

## Deliberately not done (not oversights)

- **SAP JCo** (`event-integration/sap-jco.spec.ts`) — three `test.skip()`
  placeholders, deliberately not implemented. The trigger model requires a
  `driverDependencies` field (real SAP JCo/IDoc JAR files) selected via a
  native OS file-picker dialog — Playwright cannot automate that the way it
  drives DOM forms, and no such JARs exist anywhere in this repo or test
  environment. Don't try to "finish" this without either sourcing real
  sample JARs or getting a scope decision to skip driver-dependent coverage
  entirely.
- **Salesforce** — untouched. Existing coverage was judged adequate when this
  effort started; no changes made or needed.
- **Kafka** — pre-existing coverage (`kafka.spec.ts`), out of scope for this
  effort, not touched.

## Known environment issue (read this before you panic)

For roughly the second half of the overnight session (from about 10 PM
onward), **every** VS Code test-resources launch hung indefinitely at
`_dyld_start` — before the process even reached `main()`, confirmed via
`sample <pid>`. This is not specific to any one spec: it eventually blocked
even the previously rock-solid RabbitMQ suite. It survived a full machine
reboot (gave ~35 minutes of clean behavior, then degraded back to ~100%
failure), a completely fresh re-download of VS Code, an ad-hoc code-signing
fix (see below, still worth keeping), and various sandbox/env-var
experiments. Memory, disk, fd limits, quarantine attributes, and swap all
checked healthy.

Best working theory (not proven, no sudo access to confirm): this machine
runs corporate endpoint security agents — SentinelOne, Workspace ONE
(`com.ws1.hub.EndpointSecurity`), and Sophos — which synchronously authorize
every process execution via Apple's EndpointSecurity framework. Hours of
repeatedly launching/killing/re-signing fresh Electron binaries very
plausibly backlogged that authorization pipeline, causing new execs to hang
waiting on a decision that never comes. **This is very likely tied to this
specific machine's state, not to the code** — it may simply not reproduce on
a different machine. Do not attempt to disable or work around any security
software.

Two real fixes were made and are worth keeping regardless of whether the
above theory is right:

1. **Code-signing fix** (commit `bfbe358476`): the `Electron -> Code` symlink
   workaround for macOS test builds missing that binary invalidates the app
   bundle's code signature (`codesign --verify` then fails with "a sealed
   resource is missing or invalid"). An unsigned bundle is far more likely to
   hang on launch. Both `e2e-playwright-tests/utils/helpers/setup.ts` and
   `e2e-authoring/scripts/daemon.mjs` now re-sign (ad-hoc) immediately after
   creating that symlink.
2. **Retry tooling** (same commit), dev-only, not part of the suite itself:
   - `e2e-test/watchdog.sh` — run in the background
     (`bash e2e-test/watchdog.sh &`) before a suite run. Kills any
     `--install-extension` Electron process that sits at 0% CPU for two
     consecutive ~20s-spaced checks (i.e. genuinely stuck, not just slow).
   - `e2e-test/run-suite.sh <grep-pattern> <log-file>` — wraps
     `npm run e2e-test -- --grep "<pattern>"` with up to 5 outer retries
     (Playwright's own per-test retries can get fully consumed by this hang
     before any real test logic ever runs) and sets
     `PW_TEST_HTML_REPORT_OPEN=never` so the HTML reporter's local server
     doesn't block the process from exiting after a run.

As of the last check before handoff, the hang was still happening on every
attempt (many hours of periodic health-checks, zero recoveries). **First
thing to do on the new machine: just try a normal run and see if this
environment issue reproduces there at all** — it may well not.

## How to resume

```bash
cd packages/ballerina-extension

# Optional safety net — cheap, harmless if the environment turns out healthy.
bash e2e-test/watchdog.sh &

# 1. Re-verify the Azure fix first (onMessage should now pass; onError/Delete
#    have never run at all).
bash e2e-test/run-suite.sh "Azure Integration Tests" /tmp/azure.log

# 2. Then the never-verified specs, most-to-least important:
bash e2e-test/run-suite.sh "MSSQL CDC Integration Tests" /tmp/mssql-cdc.log
bash e2e-test/run-suite.sh "Solace Integration Tests" /tmp/solace.log
bash e2e-test/run-suite.sh "Solace JMS Integration Tests" /tmp/solace-jms.log
bash e2e-test/run-suite.sh "AWS SQS Integration Tests" /tmp/sqs.log
bash e2e-test/run-suite.sh "MySQL CDC Integration Tests" /tmp/mysql-cdc.log
bash e2e-test/run-suite.sh "PostgreSQL CDC Integration Tests" /tmp/postgresql-cdc.log
bash e2e-test/run-suite.sh "Oracle DB CDC Integration Tests" /tmp/oracledb-cdc.log
```

If the environment is healthy, plain
`npm run e2e-test -- --grep "<pattern>"` is fine — skip the wrapper.

If a selector guess turns out wrong (expect this — none of these have run
live before), fix it in the spec file directly, or use the
`ballerina-e2e-writer` skill's authoring-daemon flow to discover the real
selector live: write a scratch scenario under
`e2e-test/e2e-authoring/scenarios/<name>-debug/steps/`, drive to the failure
point, dump `innerText()` / `[data-testid]` values / button labels from the
relevant panel, fix based on what you find, then delete the scratch scenario
(`rm -rf e2e-test/e2e-authoring/scenarios/<name>-debug`) and stop the daemon
(`pkill -f "bi-a-<name>-"`) when done — don't leave debug scaffolding behind.
This is exactly how the Azure `addEventHandler` bug above was found; see
commit `1b01abf9ce` for the fix it produced.

Once everything is verified, this file (`HANDOFF.md`) should be deleted
before the branch is finalized/PR'd — it's a handoff aid, not part of the
permanent suite.
