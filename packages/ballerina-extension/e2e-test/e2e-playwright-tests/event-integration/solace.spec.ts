
/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import fs from 'fs';
import path from 'path';
import { test } from '@playwright/test';
import { createArtifactAndGetWebview, deleteArtifactFromTree, domClick, getWebview, BI_INTEGRATOR_LABEL, initTest, newProjectPath, page } from '../utils/helpers';
import { Form } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';
import { addEventHandler } from './eventIntegrationUtils';

// UNVERIFIED against a live VS Code instance — a machine-level VS Code launch
// hang (see the commit message) blocked verifying this file. Written from the
// static trigger model (solace.json) plus patterns already proven live for
// RabbitMQ/MQTT/ASB on this branch:
//   - listener is a CHOICE (default "createNew") with a nested
//     listenerVarName/url/messageVpn/auth/advancedConfig group — auth is
//     ITSELF a nested CHOICE with no pre-selected default (unlike the
//     top-level listener choice), so "Basic Authentication" is selected
//     explicitly rather than assumed, same reasoning as
//     salesforce.spec.ts's authMode radio.
//   - destination is a top-level CHOICE defaulting to "queue" (has a
//     non-empty default value, unlike auth) with a queueName field —
//     assumed already selected/rendered without needing a radio click,
//     unverified.
//   - Scope deliberately limited to ONE service (no "reuse existing
//     listener" / second-listener path): MQTT's static model similarly
//     promised a reuse choice that turned out not to exist live at all, so
//     assuming Solace's does would be guessing on top of a guess. Only
//     Create + handler-add + Delete, which are the parts closest to
//     already-proven patterns.
export default function createTests() {
    test.describe.serial('Solace Integration Tests', {
    }, async () => {
        initTest();
        const listenerName = 'orderSolaceListener';
        const queueName = 'order-events';

        test('Create Solace Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);

            const artifactWebView = await createArtifactAndGetWebview('Solace Integration', 'trigger-solace');

            // listenerVarName is an IDENTIFIER field — assumed rendered as a
            // <vscode-text-field> per the confirmed RabbitMQ pattern (the real
            // <input> lives inside it).
            const listenerNameField = artifactWebView.locator('vscode-text-field[name="listenerVarName"]');
            await listenerNameField.waitFor({ timeout: 10000 });
            await listenerNameField.locator('input').fill(listenerName);

            // auth has no pre-selected default choice — select "Basic Authentication"
            // explicitly before its username/password fields can be filled.
            await domClick(artifactWebView.getByRole('radio', { name: 'Basic Authentication' }));
            await artifactWebView.locator('div[data-testid="ex-editor-username"]').waitFor();

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    url: { type: 'cmEditor', value: '"tcp://localhost:55554"', additionalProps: { switchMode: 'expression-mode' } },
                    messageVpn: { type: 'cmEditor', value: '"default"', additionalProps: { switchMode: 'expression-mode' } },
                    username: { type: 'cmEditor', value: '"test"' },
                    password: { type: 'cmEditor', value: '"test"' },
                    queueName: { type: 'cmEditor', value: `"${queueName}"`, additionalProps: { switchMode: 'expression-mode' } },
                }
            });
            await page.page.keyboard.press('Escape');
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `Solace Event Integration`], 30000);
            await artifactWebView.locator(`text=${listenerName}`).waitFor();

            const mainBal = fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8');
            if (!mainBal.includes(listenerName) || !mainBal.includes(queueName)) {
                throw new Error(`Listener/queue config not found in generated source:\n${mainBal}`);
            }
        });

        test('Add onMessage Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding onMessage handler in test attempt: ', testAttempt);

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            await addEventHandler(artifactWebView, page.page, 'On Message');
        });

        test('Delete Solace Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting Solace integration in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
            await deleteArtifactFromTree([DEFAULT_PROJECT_NAME, `Solace Event Integration`]);
        });
    });
}
