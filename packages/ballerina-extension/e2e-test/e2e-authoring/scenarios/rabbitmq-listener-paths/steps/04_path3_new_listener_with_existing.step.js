{
  const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
  globalThis.newProjectPath = state.integrationDir;
  await navigateToIntegrationOverview(state.integrationName);

  await addArtifact('RabbitMQ Integration', 'trigger-rabbitmq');
  await waitForText('Configure RabbitMQ Listener', 30000);

  // Default is already "Create new" — no need to click, but this is the path
  // that must prove a *new* listener can still be created while another
  // (orderQueueListener) already exists in the project.
  await fillNewListenerConfig({ listenerVarName: 'auditQueueListener', host: 'rabbitmq.example.com', port: 5673 });
  await fillQueueName('audit-events');

  const frame = await getBIWebview();
  const form = new Form(window, BI_INTEGRATOR_LABEL, frame);
  await form.submit('Create');

  await waitForText('auditQueueListener', 30000);
  await addRabbitMqHandler('On Error');

  await window.waitForTimeout(2000);
  const mainBal = fs.readFileSync(path.join(state.integrationDir, 'main.bal'), 'utf8');
  console.log('MAIN.BAL AFTER PATH 3:\n' + mainBal);
  if (!mainBal.includes('orderQueueListener') || !mainBal.includes('auditQueueListener')) {
    throw new Error(`Expected both listeners to coexist after path 3:\n${mainBal}`);
  }
  if (!mainBal.includes('audit-events') || !mainBal.includes('onError')) {
    throw new Error(`Path 3 source missing expected content:\n${mainBal}`);
  }
  console.log('Path 3 (new listener alongside existing) verified. All 3 paths pass.');
}
