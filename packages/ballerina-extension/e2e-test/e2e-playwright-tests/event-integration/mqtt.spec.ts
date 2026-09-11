
/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { confirmSaveChangesAndGoBack, createArtifactAndGetWebview, deleteArtifactFromTree, domClick, getWebview, BI_INTEGRATOR_LABEL, initTest, newProjectPath, page } from '../utils/helpers';
import { Form } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';
import { addEventHandler } from './eventIntegrationUtils';

// Unlike RabbitMQ, MQTT's create-service form never offers a "Use existing
// listener" choice on this branch — confirmed live: even with a listener
// already in the project, the form always asks for a fresh
// serverUri/clientId/subscriptions (Advanced Configurations only exposes the
// new listener's name, never an existing-listener picker). A second service
// would also be indistinguishable from the first in the project tree — both
// render as the identical label "MQTT Event Integration" with no
// queue/topic-style suffix — which would make the existing Delete test's
// tree lookup ambiguous. So this only covers the one listener-creation path
// that actually exists in the UI, plus the handler-add flow this file didn't
// test before.
export default function createTests() {
    test.describe.serial('MQTT Integration Tests', {
    }, async () => {
        initTest();
        test('Create MQTT Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);

            const artifactWebView = await createArtifactAndGetWebview('MQTT Integration', 'trigger-mqtt');

            const expandBtn = artifactWebView.getByText('Expand', { exact: true }).first();
            await expandBtn.click({ force: true });
            await page.page.waitForTimeout(500);
            const listenerName = `orderMqttListener`;
            await artifactWebView.locator('vscode-text-field[name="listenerVarName"]').locator('input').fill(listenerName);

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    // Was 'serviceUri' — the field's actual key is 'serverUri'; the old key
                    // never matched, so this fill silently no-opped and relied entirely on
                    // the field's own default (which happened to equal the same value).
                    'serverUri': {
                        type: 'cmEditor',
                        value: `tcp://localhost:1883`,
                        additionalProps: { switchMode: 'primary-mode' }
                    },
                    'clientId': {
                        type: 'cmEditor',
                        value: `orderClient${testAttempt}`,
                        additionalProps: { switchMode: 'primary-mode' }
                    },
                    'subscriptions': {
                        type: 'cmEditor',
                        value: `order/topic`,
                        additionalProps: { switchMode: 'primary-mode' }
                    }
                }
            });
            // Dismiss the expression helper panel opened by filling the fields above —
            // it can cover the submit button.
            await page.page.keyboard.press('Escape');
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `MQTT Event Integration`]);
            await artifactWebView.locator(`text=${listenerName}`).waitFor();

            const mainBal = fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8');
            if (!mainBal.includes(listenerName) || !mainBal.includes('order/topic')) {
                throw new Error(`Listener config not found in generated source:\n${mainBal}`);
            }
        });

        test('Add onMessage Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding onMessage handler in test attempt: ', testAttempt);

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            await addEventHandler(artifactWebView, page.page, 'On Message');
        });

        test('Editing MQTT Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Editing a service in test attempt: ', testAttempt);
            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);

            // The Create test can leave the webview either on the integration overview
            // (service shown as a diagram node — click it to reach the dedicated service
            // page) or already on that dedicated page (Configure visible directly).
            const entryNode = artifactWebView.locator('[data-testid="entry-node-service"]');
            if (await entryNode.isVisible({ timeout: 3000 }).catch(() => false)) {
                await domClick(entryNode);
            }
            const configureBtn = artifactWebView.getByRole('button', { name: 'Configure' });
            await configureBtn.waitFor();
            await domClick(configureBtn);

            const updatedServiceUri = `tcp://localhost:1010`;
            const updatedTopic = `"updated-topic"`;

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    'serverUri': {
                        type: 'cmEditor',
                        value: updatedServiceUri,
                        additionalProps: { switchMode: 'primary-mode' }
                    },
                    'subscriptions': {
                        type: 'cmEditor',
                        value: updatedTopic,
                        additionalProps: { switchMode: 'expression-mode' }
                    }
                }
            });
            await page.page.keyboard.press('Escape');
            await form.submit('Save Changes');
            await confirmSaveChangesAndGoBack(artifactWebView);

            // The dedicated service page (unlike Salesforce/Github/Twilio) shows neither
            // the listener config nor the subscription value directly, so verify the edit
            // persisted by reopening Configure and reading the field back.
            await domClick(configureBtn);
            const subscriptionsField = artifactWebView.locator('div[data-testid="ex-editor-subscriptions"]');
            await subscriptionsField.locator('.cm-content').filter({ hasText: 'updated-topic' }).waitFor();
        });

        test('Delete MQTT Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting MQTT integration in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
            await deleteArtifactFromTree([DEFAULT_PROJECT_NAME, `MQTT Event Integration`]);
        });
    });
}
