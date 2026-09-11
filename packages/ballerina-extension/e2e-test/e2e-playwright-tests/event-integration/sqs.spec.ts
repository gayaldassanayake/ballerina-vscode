
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
import { createArtifactAndGetWebview, deleteArtifactFromTree, getWebview, BI_INTEGRATOR_LABEL, initTest, newProjectPath, page } from '../utils/helpers';
import { Form } from '@wso2/playwright-vscode-tester';
import { ProjectExplorer } from '../utils/pages';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';
import { addEventHandler } from './eventIntegrationUtils';

// UNVERIFIED against a live VS Code instance — same VS Code launch hang
// described in the RabbitMQ/MQTT/ASB/Solace commits blocked verification.
// Written from the static trigger model (sqs.json). Unlike Solace's nested
// "auth" CHOICE (no pre-selected default), SQS's auth already defaults to
// "staticCredentials" ("Static Credentials"), so its accessKeyId/
// secretAccessKey/region fields are assumed already rendered without any
// radio click — region has its own default ("us-east-1") and is left
// untouched since it's a SINGLE_SELECT dropdown, a field type not yet
// exercised by any proven pattern on this branch.
// Scope excludes "reuse existing listener" for the same reason as Solace:
// unconfirmed live on this branch for any MULTIPLE_SELECT_LISTENER trigger.
export default function createTests() {
    test.describe.serial('AWS SQS Integration Tests', {
    }, async () => {
        initTest();
        const listenerName = 'orderSqsListener';
        const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/order-events';

        test('Create AWS SQS Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);

            const artifactWebView = await createArtifactAndGetWebview('AWS SQS Integration', 'trigger-aws.sqs');

            const listenerNameField = artifactWebView.locator('vscode-text-field[name="listenerVarName"]');
            await listenerNameField.waitFor({ timeout: 10000 });
            await listenerNameField.locator('input').fill(listenerName);

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    accessKeyId: { type: 'cmEditor', value: '"test-access-key"', additionalProps: { switchMode: 'expression-mode' } },
                    secretAccessKey: { type: 'cmEditor', value: '"test-secret-key"', additionalProps: { switchMode: 'expression-mode' } },
                    queueUrl: { type: 'cmEditor', value: `"${queueUrl}"`, additionalProps: { switchMode: 'expression-mode' } },
                }
            });
            await page.page.keyboard.press('Escape');
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `AWS SQS Event Integration`], 30000);
            await artifactWebView.locator(`text=${listenerName}`).waitFor();

            const mainBal = fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8');
            if (!mainBal.includes(listenerName) || !mainBal.includes('order-events')) {
                throw new Error(`Listener/queue config not found in generated source:\n${mainBal}`);
            }
        });

        test('Add onMessage Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding onMessage handler in test attempt: ', testAttempt);

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            await addEventHandler(artifactWebView, page.page, 'On Message');
        });

        test('Delete AWS SQS Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting AWS SQS integration in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
            await deleteArtifactFromTree([DEFAULT_PROJECT_NAME, `AWS SQS Event Integration`]);
        });
    });
}
