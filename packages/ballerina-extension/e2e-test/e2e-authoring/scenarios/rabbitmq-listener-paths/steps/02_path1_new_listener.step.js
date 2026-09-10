{
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  globalThis.newProjectPath = state.integrationDir;
  await navigateToIntegrationOverview(state.integrationName);

  await addArtifact('RabbitMQ Integration', 'trigger-rabbitmq');
  let frame = await getBIWebview();
  await waitForText('Configure RabbitMQ Listener', 30000);

  // Default choice is already "Create new" — confirm it's selected rather than
  // blindly clicking, to see the real accessible name of the radio.
  const snap = await snapshot();
  console.log('LISTENER CHOICE SNAPSHOT:\n' + snap);

  await fillNewListenerConfig({ listenerVarName: 'orderQueueListener', host: 'localhost', port: 5672 });
  await fillQueueName('order-events');

  frame = await getBIWebview();
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.submit('Create');

  await waitForText('orderQueueListener', 30000);
  const projectExplorer = { findItem: async () => {} }; // placeholder, real verification via .bal source below

  await addRabbitMqHandler('On Message');

  await window.waitForTimeout(2000);
  const mainBal = fs.readFileSync(path.join(state.integrationDir, 'main.bal'), 'utf8');
  console.log('MAIN.BAL AFTER PATH 1:\n' + mainBal);
  if (!mainBal.includes('orderQueueListener') || !mainBal.includes('order-events') || !mainBal.includes('onMessage')) {
    throw new Error(`Path 1 source missing expected content:\n${mainBal}`);
  }
  console.log('Path 1 (new listener + service) verified.');
}
