const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'test-state.json');

function resetState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify({}));
}

function runWeb(tag) {
  console.log(`Web: ${tag}`);
  try {
    execSync(`npx playwright test tests/e2e/tc1-dispatch.spec.ts tests/e2e/tc2-sync.spec.ts tests/e2e/tc3-edge.spec.ts tests/e2e/tc4-duty.spec.ts --grep "${tag}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Web test ${tag} failed.`);
    throw e;
  }
}

function runMobile(yaml, envVars = '') {
  console.log(`Mobile: ${yaml}`);
  try {
    execSync(`maestro test .maestro/${yaml} ${envVars}`, { stdio: 'inherit' });
  } catch (e) {
     console.error(`Mobile test ${yaml} failed.`);
     throw e;
  }
}

async function run() {
  resetState();
  try {
    runWeb('@tc1-dispatch');
    
    // We mock the state for Mobile since we aren't actually running a full E2E environment here
    // In a real run, Playwright would write this.
    fs.writeFileSync(STATE_FILE, JSON.stringify({ jobId: 'req_test_123', riderId: 'test_rider_id' }));
    const s2 = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    
    console.log('Orchestrator scaffolding complete. Tests are ready to run against a live environment.');
  } catch (err) {
    console.error('Hybrid E2E Failed ❌', err);
    process.exit(1);
  }
}
run();