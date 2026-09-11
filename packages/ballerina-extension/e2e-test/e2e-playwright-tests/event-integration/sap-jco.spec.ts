
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
import { test } from '@playwright/test';
import { createArtifactAndGetWebview, deleteArtifactFromTree, getWebview, BI_INTEGRATOR_LABEL, initTest, page } from '../utils/helpers';
import { DEFAULT_PROJECT_NAME } from '../utils/helpers/constants';

// NOT ATTEMPTED, deliberately — SAP JCo is categorically different from the
// other 11 triggers covered tonight. Its trigger model (sap.jco.json)
// requires a REQUIRED "SAP Driver Libraries" field (driverDependencies:
// sapIdocDriverPath + a second JAR path) — SAP's proprietary JCo middleware
// JARs, which are licensed, not publicly distributable, and not bundled
// anywhere in this repo or test environment (confirmed: no sapjco/sapidoc
// JARs found anywhere in the working tree). Filling this field means driving
// a native OS "Open File" dialog to pick real files that don't exist here,
// not a web form field like every other trigger tonight — Playwright can't
// automate a native Electron file-picker dialog the way it does DOM inputs,
// and there's nothing to point it at even if it could.
//
// Writing a speculative Create/Delete test here (as done for the other new
// triggers tonight) would misrepresent the actual blocker as "just needs a
// live run to verify selectors" when it's really "needs real licensed JAR
// files this environment doesn't have" — a fundamentally different, and
// likely persistent, prerequisite. Left as a placeholder describing exactly
// what's needed to attempt this for real: either sample/mock SAP JCo JARs
// placed somewhere in the project (and their real path), or a decision to
// scope SAP JCo e2e coverage down to whatever doesn't require the driver
// files at all (if that's even possible — unconfirmed, since
// driverDependencies is unconditionally required per the trigger model).
export default function createTests() {
    test.describe.serial('SAP JCo Integration Tests', {
    }, async () => {
        initTest();

        test.skip('Create SAP JCo Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Creating a new service in test attempt: ', testAttempt);

            // Not implemented — see file header. This artifactId
            // ('trigger-sap.jco') is inferred from the trigger model's "type"
            // field, matching the pattern confirmed for every other trigger,
            // but is itself unverified.
            const artifactWebView = await createArtifactAndGetWebview('SAP JCo Integration', 'trigger-sap.jco');
            void artifactWebView;
        });

        test.skip('Add onReceive Handler', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Adding onReceive handler in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
        });

        test.skip('Delete SAP JCo Integration', async ({ }, testInfo) => {
            const testAttempt = testInfo.retry + 1;
            console.log('Deleting SAP JCo integration in test attempt: ', testAttempt);

            await getWebview(BI_INTEGRATOR_LABEL, page);
            await deleteArtifactFromTree([DEFAULT_PROJECT_NAME, `SAP JCo Event Integration`]);
        });
    });
}
