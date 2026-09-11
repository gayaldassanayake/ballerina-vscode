
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
// described in the RabbitMQ/MQTT/ASB/Solace/SQS commits blocked
// verification. Written from the static trigger model (mysql.json), which
// unlike the message-broker triggers has no listener-level auth CHOICE —
// just direct hostname (default "localhost")/port (default 3306)/username/
// password fields, plus a top-level "table" field (optional, format
// "<database>.<table>") and an optional "databases" TEXT_SET field (a field
// type not exercised by any proven pattern here — deliberately left empty
// rather than guessed at, since it's optional). Scope excludes "reuse
// existing listener" for the same reason as the message-broker triggers.
export default function createTests() {
    test.describe.serial('MySQL CDC Integration Tests', {
    }, async () => {
        initTest();
        const listenerName = 'orderMysqlCdcListener';
        const table = 'orderdb.orders';

        test('Create MySQL CDC Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);

            const artifactWebView = await createArtifactAndGetWebview('MySQL CDC Integration', 'trigger-mysql');

            const listenerNameField = artifactWebView.locator('vscode-text-field[name="listenerVarName"]');
            await listenerNameField.waitFor({ timeout: 10000 });
            await listenerNameField.locator('input').fill(listenerName);

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    username: { type: 'cmEditor', value: '"test"', additionalProps: { switchMode: 'expression-mode' } },
                    password: { type: 'cmEditor', value: '"test"', additionalProps: { switchMode: 'expression-mode' } },
                    table: { type: 'cmEditor', value: `"${table}"`, additionalProps: { switchMode: 'expression-mode' } },
                }
            });
            await page.page.keyboard.press('Escape');
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `MySQL CDC Integration`], 30000);
            await artifactWebView.locator(`text=${listenerName}`).waitFor();

            const mainBal = fs.readFileSync(path.join(newProjectPath, 'main.bal'), 'utf8');
            if (!mainBal.includes(listenerName)) {
                throw new Error(`Listener config not found in generated source:\n${mainBal}`);
            }
        });

        test('Add onCreate Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding onCreate handler in test attempt: ', testAttempt);

            const artifactWebView = await getWebview(BI_INTEGRATOR_LABEL, page);
            await addEventHandler(artifactWebView, page.page, 'On Create');
        });

        test('Delete MySQL CDC Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting MySQL CDC integration in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
            await deleteArtifactFromTree([DEFAULT_PROJECT_NAME, `MySQL CDC Integration`]);
        });
    });
}
