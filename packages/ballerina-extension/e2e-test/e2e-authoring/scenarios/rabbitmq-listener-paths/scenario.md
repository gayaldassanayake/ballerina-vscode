# RabbitMQ Listener Paths

Covers the three ways a RabbitMQ service's `listener` (a `CHOICE` field in
`trigger-models/rabbitmq.json`) can be resolved when creating a `trigger-rabbitmq`
artifact, with a distinct config + handler per path so the coverage spreads
across host/port, listener name, queue name, `autoAck`, and handler type.

All three services are created in one project so paths 2 and 3 can depend on a
listener created earlier.

## Steps

| # | Action | Verification |
|---|--------|-------------|
| 1 | Create a new project + integration | Lands on integration overview showing "Add Artifact" |
| 2 | Add Artifact → RabbitMQ Integration. Leave listener choice on "Create new". Set Listener Name = `orderQueueListener`, Host = `localhost`, Port = `5672`, Queue Name = `order-events`. Create. Add an `onMessage` handler with a JSON payload type. | Tree shows `RabbitMQ Event Integration - order-events`; listener `orderQueueListener` visible; `onMessage` function present in generated source |
| 3 | Add Artifact → RabbitMQ Integration again. Switch listener choice to "Use existing", select `orderQueueListener`. Queue Name = `payment-events`. Create. Toggle `autoAck` off via Configure → `serviceConfig` Record Configuration modal. Add an `onRequest` handler. | Tree shows `RabbitMQ Event Integration - payment-events`; **no second listener** is created — source shows only `orderQueueListener`, this service attached to it, `autoAck: false`; `onRequest` function present |
| 4 | Add Artifact → RabbitMQ Integration again, with `orderQueueListener` + `payment-events` already in the project. Leave listener choice on "Create new". Set Listener Name = `auditQueueListener`, Host = `rabbitmq.example.com`, Port = `5673`, Queue Name = `audit-events`. Create. Add an `onError` handler. | Tree shows `RabbitMQ Event Integration - audit-events`; both `orderQueueListener` and `auditQueueListener` now exist; `audit-events` service attached to `auditQueueListener` specifically; `onError` function present |

## Decisions / Gaps

**Not executed against a live VS Code instance.** The authoring daemon
(`run-steps.sh` → `daemon.mjs`) cannot launch in this sandbox: the cached
macOS test VS Code build under `e2e-test/test-resources/` ships
`Contents/MacOS/Code` but this repo's `@wso2/playwright-vscode-tester`
(submodule) hardcodes `Contents/MacOS/Electron` on darwin. The promoted
Playwright suite already works around this via `ensureMacElectronSymlink()`
in `utils/helpers/setup.ts`; the same fix was added to `daemon.mjs`, but on
this machine even a re-signed (`codesign --force --deep --sign -`) copy was
still killed (SIGKILL) on launch and macOS auto-trashed the app bundle after
a Gatekeeper "is damaged" prompt. This is an environment-level issue —
it blocks the whole e2e suite here, not anything specific to this scenario.
The 4 step files in this directory are written from strong precedent but
**unexecuted**; run them via `run-steps.sh` once VS Code can launch (e.g. on
CI, or locally after clearing/approving the test VS Code copy) and fix up
whatever doesn't match.

Specific points to verify live:
- Listener-choice radio accessible names — used `getByRole('radio', { name: 'Create new' | 'Use existing' })`, following the confirmed precedent `getByRole('radio', { name: 'Custom Listener' })` in `api-integration/http-service.spec.ts:403` and the exact choice labels in `trigger-models/rabbitmq.json`.
- `existingListener` (`SINGLE_SELECT_LISTENER`) control — no prior test drives this field; `helpers/rabbitmq.js`'s `selectExistingListener` tries a few candidate selectors and text-based option matching as a best guess.
- `host`/`port` fill strategy — assumed `cmEditor` (same `ex-editor-<key>` pattern as `queueName`) since both are TEXT/EXPRESSION-toggle fields in the trigger model, unlike the plain `input[name="listenerVarName"]` used for the IDENTIFIER field.
- `onRequest`/`onError` handler cards — assumed `function-card-On Request` / `function-card-On Error`, following the confirmed `function-card-On Message` convention and the `metadata.label` values in the trigger model.
- `autoAck` toggle — reused the exact (already-written but `test.skip`'d) pattern from `rabbitmq.spec.ts`'s "Editing RabbitMQ Integration" test.
