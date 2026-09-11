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

import { Frame, Page } from '@playwright/test';

/**
 * Locates the "Add Handler" button on a listener's service designer view.
 * Its markup varies (plain button, vscode-button, or a data-testid'd
 * element) depending on the connector, so every candidate shape is tried.
 * Shared by Kafka and RabbitMQ, the two listeners whose handler-add flow
 * this repo currently automates.
 */
export function locateAddHandlerButton(webview: Frame) {
    return webview.locator('button:has-text("Add Handler")').or(
        webview.locator('button:has-text("Handler")')
    ).or(
        webview.locator('vscode-button').filter({ hasText: /Add Handler|Handler/i })
    ).or(
        webview.locator('[data-testid*="add-handler"], [data-testid*="handler"]')
    );
}

/**
 * Adds an event handler function (e.g. "On Message", "On Error") to whatever
 * event-integration service is currently open, and waits for confirmation.
 *
 * Two distinct completion shapes exist across triggers/handlers, discovered
 * live (not from any static spec) and NOT distinguishable by handler name
 * alone — some handlers on the same trigger use one shape, some the other:
 *   - A DATA_BINDING/payload-typed parameter (e.g. RabbitMQ's onMessage) opens
 *     a side panel with a "Define Message Configuration" link → "Continue
 *     with JSON Type" → Save. Saving lands on the new handler's own flow page,
 *     whose title bar shows the raw camelCase function name (e.g.
 *     "onMessage"), not the picker card's display label ("On Message").
 *   - A handler whose parameters are all fixed types (e.g. RabbitMQ's
 *     onError) has nothing to configure: the card click adds it directly,
 *     with no side panel and no Save step at all — confirmed by the function
 *     name appearing directly in the service page's handler list.
 *   - A handler with a fixed-type-only parameter that nonetheless opens a
 *     side panel (e.g. MQTT's onMessage, param type `mqtt:Message`) skips
 *     straight to a ready-to-click Save button, no "Define Message
 *     Configuration" link.
 * Whether the panel appears is checked with a generous wait (some panels are
 * slower to render than others) rather than keyed on the handler's name —
 * a too-tight wait previously misclassified a slow-rendering panel as "no
 * panel needed" under machine load, silently skipping the whole config+Save
 * flow and failing later with a much more confusing error. Correctness
 * matters far more than a few saved seconds here, especially unattended.
 */
export async function addEventHandler(webView: Frame, page: Page, displayName: string): Promise<void> {
    const entryNode = webView.locator('[data-testid="entry-node-service"]');
    if (await entryNode.isVisible({ timeout: 3000 }).catch(() => false)) {
        await entryNode.evaluate((el: HTMLElement) => el.click());
    }

    const addHandlerBtn = locateAddHandlerButton(webView);
    await addHandlerBtn.first().waitFor();
    await addHandlerBtn.first().click({ force: true });
    await page.waitForTimeout(1000);

    // The handler picker card's testid is "function-card-<Display Name>" (e.g.
    // "function-card-On Message"), not the camelCase function name.
    const card = webView.locator(`[data-testid="function-card-${displayName}"]`);
    await card.waitFor({ state: 'visible' });
    await card.click();

    const functionName = displayName.charAt(0).toLowerCase() + displayName.slice(1).replace(/\s+/g, '');
    const definePanel = webView.locator('[data-testid="side-panel"]');
    // Polls in small increments (up to ~22s total) rather than a single long
    // isVisible() wait — confirmed live this catches a panel that takes a
    // couple of seconds to render (RabbitMQ, MQTT) without over-waiting when
    // no panel is coming at all (RabbitMQ's onError). Logged because this
    // exact detection previously misfired twice under machine load; the
    // trail is cheap and has already been useful for debugging.
    let panelAppeared = false;
    for (let i = 0; i < 15; i++) {
        panelAppeared = await definePanel.isVisible({ timeout: 500 }).catch(() => false);
        if (panelAppeared) break;
        await page.waitForTimeout(1500);
    }
    console.log(`[addEventHandler] ${displayName}: panel appeared=${panelAppeared}`);

    if (panelAppeared) {
        const defineConfigLink = definePanel.getByText('Define Message Configuration', { exact: true });
        if (await defineConfigLink.isVisible({ timeout: 10000 }).catch(() => false)) {
            await defineConfigLink.click({ force: true });

            const continueWithJsonBtn = webView.getByText('Continue with JSON Type', { exact: true });
            await continueWithJsonBtn.waitFor({ state: 'visible', timeout: 10000 });
            await continueWithJsonBtn.click();
        }

        const saveBtn = definePanel.getByRole('button', { name: 'Save' });
        await saveBtn.first().waitFor({ state: 'visible', timeout: 20000 });
        await saveBtn.first().click({ force: true });

        const titleBarContainer = webView.locator('[data-testid="title-bar-container"]');
        await titleBarContainer.getByText(functionName, { exact: true }).first()
            .waitFor({ state: 'visible', timeout: 30000 });
    } else {
        await webView.getByText(functionName, { exact: true }).first()
            .waitFor({ state: 'visible', timeout: 20000 });
    }
}
