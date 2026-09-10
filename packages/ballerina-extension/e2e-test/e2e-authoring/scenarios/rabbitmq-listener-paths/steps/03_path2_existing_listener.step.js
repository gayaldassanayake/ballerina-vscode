{
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  globalThis.newProjectPath = state.integrationDir;
  await navigateToIntegrationOverview(state.integrationName);

  await addArtifact('RabbitMQ Integration', 'trigger-rabbitmq');
  await waitForText('Configure RabbitMQ Listener', 30000);

  await selectListenerChoice('Use existing');
  await selectExistingListener('orderQueueListener');
  await fillQueueName('payment-events');

  const frame = await getBIWebview();
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.submit('Create');

  await waitForText('payment-events', 30000);
  await toggleAutoAckOff();
  await addRabbitMqHandler('On Request');

  await window.waitForTimeout(2000);
  const mainBal = fs.readFileSync(path.join(state.integrationDir, 'main.bal'), 'utf8');
  console.log('MAIN.BAL AFTER PATH 2:\n' + mainBal);
  const listenerDeclCount = (mainBal.match(/rabbitmq:Listener/g) || []).length;
  if (listenerDeclCount !== 1) {
    throw new Error(`Expected exactly 1 rabbitmq:Listener declaration after path 2 (reuse), found ${listenerDeclCount}:\n${mainBal}`);
  }
  if (!mainBal.includes('payment-events') || !mainBal.includes('onRequest')) {
    throw new Error(`Path 2 source missing expected content:\n${mainBal}`);
  }
  console.log('Path 2 (reuse existing listener) verified.');
}
