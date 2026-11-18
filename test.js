/**
 * Automated Test Suite for Lamport Logical Clock Simulator
 * Distributed Computing Mini Project
 */

const assert = require('assert');
const { LamportSimulator } = require('./src/lamport.js');
const { SCENARIOS } = require('./src/scenarios.js');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
}

console.log('\n======================================================');
console.log('   LAMPORT LOGICAL CLOCK SIMULATOR - TEST SUITE');
console.log('======================================================\n');

// 1. Rule 1: Internal Event
runTest('IR1: Internal events strictly increment process clock by 1', () => {
  const sim = new LamportSimulator(2);
  const p1 = sim.getProcess(1);
  assert.strictEqual(p1.clock, 0);

  const e1 = sim.localEvent(1);
  assert.strictEqual(p1.clock, 1);
  assert.strictEqual(e1.event.clock, 1);
  assert.strictEqual(e1.event.type, 'INTERNAL');

  const e2 = sim.localEvent(1);
  assert.strictEqual(p1.clock, 2);
  assert.strictEqual(e2.event.clock, 2);
});

// 2. Rule 2: Send Event
runTest('IR2: Send event increments sender clock and tags message timestamp', () => {
  const sim = new LamportSimulator(2);
  const res = sim.sendMessage(1, 2, 'hello');
  
  assert.strictEqual(sim.getProcess(1).clock, 1);
  assert.strictEqual(res.sendEvent.clock, 1);
  assert.strictEqual(res.sendEvent.type, 'SEND');
  assert.strictEqual(res.message.sendTimestamp, 1);
  assert.strictEqual(res.message.senderPid, 1);
  assert.strictEqual(res.message.receiverPid, 2);
  assert.strictEqual(res.message.status, 'IN_FLIGHT');
});

// 3. Rule 3: Receive Event & Clock Leap
runTest('IR3: Receive event updates clock = max(receiverClock, msgTimestamp) + 1', () => {
  const sim = new LamportSimulator(2);
  // Sender does 3 events
  sim.localEvent(1); // L=1
  sim.localEvent(1); // L=2
  const sendRes = sim.sendMessage(1, 2, 'data'); // L=3, msg.ts=3

  // Receiver is at clock 0
  assert.strictEqual(sim.getProcess(2).clock, 0);

  const recvRes = sim.deliverMessage(sendRes.message.id);
  assert.strictEqual(recvRes.oldClock, 0);
  assert.strictEqual(recvRes.newClock, 4); // max(0, 3) + 1 = 4
  assert.strictEqual(sim.getProcess(2).clock, 4);
  assert.strictEqual(recvRes.receiveEvent.type, 'RECEIVE');
  assert.strictEqual(recvRes.message.status, 'DELIVERED');
});

// 4. Rule 3 when Receiver Clock is already higher
runTest('IR3: When receiver clock is higher than message timestamp, receiverClock + 1 is used', () => {
  const sim = new LamportSimulator(2);
  const sendRes = sim.sendMessage(1, 2, 'data'); // msg.ts = 1
  
  // Receiver does 5 local events
  for (let i = 0; i < 5; i++) sim.localEvent(2); // receiver clock = 5

  const recvRes = sim.deliverMessage(sendRes.message.id);
  // max(5, 1) + 1 = 6
  assert.strictEqual(recvRes.newClock, 6);
  assert.strictEqual(sim.getProcess(2).clock, 6);
});

// 5. Total Ordering & Tie Breaking
runTest('Total Order: Sorts by clock ascending, then by PID for concurrent ties', () => {
  const sim = new LamportSimulator(3);
  // Generate simultaneous events on P1, P2, P3
  sim.localEvent(2); // e1: P2, clock 1
  sim.localEvent(1); // e2: P1, clock 1
  sim.localEvent(3); // e3: P3, clock 1
  sim.localEvent(2); // e4: P2, clock 2
  sim.localEvent(1); // e5: P1, clock 2

  const totalOrder = sim.getTotalOrder();
  assert.strictEqual(totalOrder.length, 5);

  // Expected order for clock 1: P1 (L=1), P2 (L=1), P3 (L=1)
  assert.strictEqual(totalOrder[0].pid, 1);
  assert.strictEqual(totalOrder[0].clock, 1);
  assert.strictEqual(totalOrder[1].pid, 2);
  assert.strictEqual(totalOrder[1].clock, 1);
  assert.strictEqual(totalOrder[2].pid, 3);
  assert.strictEqual(totalOrder[2].clock, 1);

  // Expected order for clock 2: P1 (L=2), P2 (L=2)
  assert.strictEqual(totalOrder[3].pid, 1);
  assert.strictEqual(totalOrder[3].clock, 2);
  assert.strictEqual(totalOrder[4].pid, 2);
  assert.strictEqual(totalOrder[4].clock, 2);
});

// 6. Happens-Before Transitivity
runTest('Happens-Before: Transitive causality across message chains (P1 -> P2 -> P3)', () => {
  const sim = new LamportSimulator(3);
  const m1 = sim.sendMessage(1, 2, 'step 1');
  sim.deliverMessage(m1.message.id);
  const m2 = sim.sendMessage(2, 3, 'step 2');
  sim.deliverMessage(m2.message.id);

  const eFirst = m1.sendEvent;
  const eLast = sim.getProcess(3).lastEvent;

  const rel = sim.checkHappensBefore(eFirst.id, eLast.id);
  assert.strictEqual(rel.relation, 'A_HAPPENS_BEFORE_B');
  assert.strictEqual(rel.symbol, '->');
  assert.ok(rel.path.length >= 4); // chain of at least 4 events
});

// 7. Concurrency Detection
runTest('Concurrency: Disconnected events are correctly identified as concurrent (||)', () => {
  const sim = new LamportSimulator(2);
  const e1 = sim.localEvent(1).event;
  const e2 = sim.localEvent(2).event;

  const rel = sim.checkHappensBefore(e1.id, e2.id);
  assert.strictEqual(rel.relation, 'CONCURRENT');
  assert.strictEqual(rel.symbol, '||');
});

// 8. Clock Condition Invariant on All Preset Scenarios
runTest('Clock Condition: Invariant a -> b => C(a) < C(b) holds across all 5 preset scenarios', () => {
  for (const scen of SCENARIOS) {
    const sim = new LamportSimulator();
    scen.run(sim);
    const verification = sim.verifyTheoreticalProperties();
    assert.strictEqual(
      verification.passed,
      true,
      `Scenario "${scen.name}" failed verification: ${JSON.stringify(verification.violations)}`
    );
    assert.strictEqual(verification.violations.length, 0);
  }
});

console.log('\n------------------------------------------------------');
console.log(`Results: ${passedTests} passed, ${totalTests - passedTests} failed, total ${totalTests}`);
console.log('------------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
