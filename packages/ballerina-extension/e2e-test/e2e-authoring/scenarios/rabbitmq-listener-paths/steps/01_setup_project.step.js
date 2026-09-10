{
  const state = await createProjectAndIntegration('RabbitmqListenerPaths');
  fs.writeFileSync(path.join(sessionDir, 'state.json'), JSON.stringify(state, null, 2));
  console.log(`created ${state.projectName}/${state.integrationName}`);
}
