
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
// blocked verification tonight. Structurally near-identical to
// mysql-cdc.spec.ts; the trigger model (postgresql.json) differs mainly in a
// REQUIRED top-level "database" field (MySQL's equivalent "databases" is an
// optional TEXT_SET, deliberately skipped there) and port defaulting to 5432.
export default function createTests() {
    test.describe.serial('PostgreSQL CDC Integration Tests', {
    }, async () => {
        initTest();
        const listenerName = 'orderPostgresqlCdcListener';
        const table = 'orders';

        test('Create PostgreSQL CDC Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);

            const artifactWebView = await createArtifactAndGetWebview('PostgreSQL CDC Integration', 'trigger-postgresql');

            const listenerNameField = artifactWebView.locator('vscode-text-field[name="listenerVarName"]');
            await listenerNameField.waitFor({ timeout: 10000 });
            await listenerNameField.locator('input').fill(listenerName);

            const form = new Form(page.page, BI_INTEGRATOR_LABEL, artifactWebView);
            await form.switchToFormView(false, artifactWebView);
            await form.fill({
                values: {
                    username: { type: 'cmEditor', value: '"test"', additionalProps: { switchMode: 'expression-mode' } },
                    password: { type: 'cmEditor', value: '"test"', additionalProps: { switchMode: 'expression-mode' } },
                    database: { type: 'cmEditor', value: '"orderdb"', additionalProps: { switchMode: 'expression-mode' } },
                    table: { type: 'cmEditor', value: `"${table}"`, additionalProps: { switchMode: 'expression-mode' } },
                }
            });
            await page.page.keyboard.press('Escape');
            await form.submit('Create');

            const projectExplorer = new ProjectExplorer(page.page);
            await projectExplorer.findItem([DEFAULT_PROJECT_NAME, `PostgreSQL CDC Integration`], 30000);
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

        test('Delete PostgreSQL CDC Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting PostgreSQL CDC integration in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
            await deleteArtifactFromTree([DEFAULT_PROJECT_NAME, `PostgreSQL CDC Integration`]);
        });
    });
}
