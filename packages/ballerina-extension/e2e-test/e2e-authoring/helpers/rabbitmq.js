globalThis.locateAddHandlerButton = (frame) => frame.locator('button:has-text("Add Handler")').or(
  frame.locator('button:has-text("Handler")')
).or(
  frame.locator('vscode-button').filter({ hasText: /Add Handler|Handler/i })
).or(
  frame.locator('[data-testid*="add-handler"], [data-testid*="handler"]')
);

globalThis.selectListenerChoice = async (choiceLabel) => {
  const frame = await getBIWebview();
  const radio = frame.getByRole('radio', { name: choiceLabel });
  await radio.waitFor({ state: 'visible', timeout: 15000 });
  await radio.click({ force: true });
  await frame.waitForTimeout(500);
};

globalThis.fillCmEditorField = async (key, value, { switchMode = 'expression-mode' } = {}) => {
  const frame = await getBIWebview();
  const containerDiv = frame.locator(`div[data-testid="ex-editor-${key}"]`);
  await containerDiv.waitFor({ state: 'visible', timeout: 15000 });
  if (switchMode) {
    const modeBtn = containerDiv.locator(`[data-testid="${switchMode}"]`);
    if (await modeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modeBtn.click({ force: true });
      await frame.waitForTimeout(500);
    }
  }
  const cmEditor = containerDiv.locator('.cm-editor');
  await cmEditor.waitFor({ state: 'visible', timeout: 10000 });
  const dispatched = await containerDiv.evaluate((container, text) => {
    const cmContent = container.querySelector('.cm-content');
    if (!cmContent) return false;
    const view = cmContent.cmView?.view;
    if (!view) return false;
    view.focus();
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    return true;
  }, value);
  if (!dispatched) {
    const editorInput = cmEditor.locator('div[contenteditable="true"]');
    await editorInput.click({ clickCount: 3 });
    await editorInput.fill(value);
  }
  await window.keyboard.press('Escape');
};

globalThis.fillListenerVarName = async (name) => {
  const frame = await getBIWebview();
  const input = frame.locator('input[name="listenerVarName"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.click({ clickCount: 3 });
  await input.pressSequentially(name, { delay: 30 });
};

globalThis.fillNewListenerConfig = async ({ listenerVarName, host, port }) => {
  await fillListenerVarName(listenerVarName);
  await fillCmEditorField('host', `"${host}"`);
  await fillCmEditorField('port', String(port));
};

globalThis.selectExistingListener = async (listenerName) => {
  const frame = await getBIWebview();
  const control = frame.locator('[data-testid="existingListener"], [name="existingListener"]').first()
    .or(frame.locator('vscode-dropdown[aria-label="Listener"]'))
    .or(frame.locator('div[data-testid="ex-editor-existingListener"]'));
  await control.waitFor({ state: 'visible', timeout: 15000 });
  await control.click({ force: true });
  await frame.waitForTimeout(500);
  const option = frame.getByText(listenerName, { exact: true }).last();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click({ force: true });
};

globalThis.fillQueueName = async (queueName) => {
  const frame = await getBIWebview();
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.fill({
    values: {
      queueName: {
        type: 'cmEditor',
        value: `"${queueName}"`,
        additionalProps: { switchMode: 'expression-mode' }
      }
    }
  });
  await window.keyboard.press('Escape');
};

globalThis.addRabbitMqHandler = async (displayName) => {
  const frame = await getBIWebview();
  const entryNode = frame.locator('[data-testid="entry-node-service"]');
  if (await entryNode.isVisible({ timeout: 3000 }).catch(() => false)) {
    await domClick(entryNode);
  }
  const addHandlerBtn = locateAddHandlerButton(frame);
  await addHandlerBtn.first().waitFor({ timeout: 15000 });
  await addHandlerBtn.first().click({ force: true });
  await frame.waitForTimeout(1000);

  const card = frame.locator(`[data-testid="function-card-${displayName}"]`);
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await card.click();

  const definePanel = frame.locator('[data-testid="side-panel"]');
  const defineConfigLink = definePanel.getByText('Define Message Configuration', { exact: true });
  await defineConfigLink.waitFor({ state: 'visible', timeout: 10000 });
  await defineConfigLink.click({ force: true });

  const continueWithJsonBtn = frame.getByText('Continue with JSON Type', { exact: true });
  await continueWithJsonBtn.waitFor({ state: 'visible', timeout: 5000 });
  await continueWithJsonBtn.click();

  const saveBtn = definePanel.getByRole('button', { name: 'Save' });
  await saveBtn.first().waitFor({ state: 'visible', timeout: 5000 });
  await saveBtn.first().click({ force: true });

  const titleBarContainer = frame.locator('[data-testid="title-bar-container"]');
  await titleBarContainer.getByText(displayName, { exact: true }).first()
    .waitFor({ state: 'visible', timeout: 30000 });
};

globalThis.toggleAutoAckOff = async () => {
  const frame = await getBIWebview();
  const configureBtn = frame.getByRole('button', { name: 'Configure' });
  await configureBtn.waitFor({ timeout: 15000 });
  await domClick(configureBtn);

  const serviceConfigTextarea = frame.locator('vscode-text-area[name="serviceConfig"] textarea');
  await serviceConfigTextarea.click({ force: true });
  const recordConfigOverlay = frame.locator('.unq-modal-overlay').last();
  const autoAckCheckbox = recordConfigOverlay.locator(
    'xpath=//p[normalize-space(text())="autoAck"]/preceding-sibling::vscode-checkbox[1]'
  );
  await autoAckCheckbox.waitFor({ timeout: 10000 });
  const isChecked = await autoAckCheckbox.getAttribute('current-checked');
  if (isChecked !== 'false') {
    await autoAckCheckbox.evaluate((el) => el.click());
  }
  await recordConfigOverlay.getByRole('button').first().click({ force: true });

  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.switchToFormView(false, frame);
  await form.submit('Save Changes');

  const saveChangesBtn = frame.locator('#save-changes-btn vscode-button[appearance="primary"]');
  await saveChangesBtn.waitFor({ state: 'visible', timeout: 10000 });
  const backBtn = frame.locator('[data-testid="back-button"]');
  await backBtn.waitFor({ timeout: 10000 });
  await backBtn.click();
};
