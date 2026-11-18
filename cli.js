#!/usr/bin/env node

/**
 * Lamport Logical Clock Simulator - Command Line Interface (CLI)
 * Distributed Computing Mini Project
 */

const { LamportSimulator } = require('./src/lamport.js');
const { SCENARIOS, getScenario } = require('./src/scenarios.js');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m'
};

function printBanner() {
  console.log(`
${COLORS.cyan}${COLORS.bold}========================================================================
   LAMPORT LOGICAL CLOCK SIMULATOR - DISTRIBUTED COMPUTING MINI PROJECT
========================================================================${COLORS.reset}
  Implementation of Leslie Lamport's 1978 Seminal Paper:
  "Time, Clocks, and the Ordering of Events in a Distributed System"
`);
}

function printHelp() {
  console.log(`Usage:
  node cli.js [scenario_number_or_id]

Available Scenarios:`);
  SCENARIOS.forEach((s, idx) => {
    console.log(`  ${COLORS.yellow}${idx + 1}${COLORS.reset}: ${s.name}`);
    console.log(`     ${COLORS.dim}${s.description}${COLORS.reset}`);
  });
  console.log(`
Examples:
  node cli.js 1             # Runs Lamport 1978 Classic scenario
  node cli.js 2             # Runs Concurrent Tie-Breaking scenario
  node cli.js interactive   # Interactive simulation menu
`);
}

function renderEventTable(events) {
  console.log(`\n${COLORS.bold}=== Global Execution Event Log (Wall-Clock Arrival) ===${COLORS.reset}`);
  console.log('+-----+----------+-----------+---------+----------------------------------------------+');
  console.log('| ID  | Process  | Type      | Clock L | Description                                  |');
  console.log('+-----+----------+-----------+---------+----------------------------------------------+');

  for (const e of events) {
    const typeColor = e.type === 'SEND' ? COLORS.magenta : (e.type === 'RECEIVE' ? COLORS.green : COLORS.cyan);
    const idStr = e.id.padEnd(3);
    const procStr = e.processName.padEnd(8);
    const typeStr = `${typeColor}${e.type.padEnd(9)}${COLORS.reset}`;
    const clockStr = `L=${e.clock}`.padEnd(7);
    const labelStr = (e.label || '').slice(0, 44).padEnd(44);

    console.log(`| ${idStr} | ${procStr} | ${typeStr} | ${clockStr} | ${labelStr} |`);
  }
  console.log('+-----+----------+-----------+---------+----------------------------------------------+');
}

function renderTotalOrder(totalOrder) {
  console.log(`\n${COLORS.bold}=== Lamport's Total Ordering of Events (-> and Tie-Broken by PID) ===${COLORS.reset}`);
  console.log(`${COLORS.dim}Sorting Criteria: L(e1) < L(e2) OR (L(e1) == L(e2) AND PID(e1) < PID(e2))${COLORS.reset}\n`);

  console.log('+------+-----+----------+-----------+---------+--------------------------------------------+');
  console.log('| Rank | ID  | Process  | Type      | Clock L | Total Order Justification                  |');
  console.log('+------+-----+----------+-----------+---------+--------------------------------------------+');

  totalOrder.forEach((e, idx) => {
    const rank = String(idx + 1).padStart(4);
    const idStr = e.id.padEnd(3);
    const procStr = e.processName.padEnd(8);
    const typeColor = e.type === 'SEND' ? COLORS.magenta : (e.type === 'RECEIVE' ? COLORS.green : COLORS.cyan);
    const typeStr = `${typeColor}${e.type.padEnd(9)}${COLORS.reset}`;
    const clockStr = `L=${e.clock}`.padEnd(7);

    let justification = `Clock = ${e.clock}, Process = ${e.processName}`;
    if (idx > 0) {
      const prev = totalOrder[idx - 1];
      if (prev.clock === e.clock) {
        justification += ` (Tie broken: PID ${prev.pid} < PID ${e.pid})`;
      } else {
        justification += ` (Clock ${prev.clock} < ${e.clock})`;
      }
    }
    const justStr = justification.padEnd(42);

    console.log(`| ${rank} | ${idStr} | ${procStr} | ${typeStr} | ${clockStr} | ${justStr} |`);
  });
  console.log('+------+-----+----------+-----------+---------+--------------------------------------------+');

  console.log(`\n${COLORS.bold}Total Order Chain:${COLORS.reset}`);
  const chainStr = totalOrder.map(e => `${COLORS.yellow}${e.id}${COLORS.reset}(P${e.pid},L=${e.clock})`).join(` ${COLORS.dim}=>${COLORS.reset} `);
  console.log(`  ${chainStr}\n`);
}

function renderSpaceTimeAscii(sim) {
  console.log(`\n${COLORS.bold}=== Space-Time Process Timeline Ladder ===${COLORS.reset}`);
  const processes = sim.getAllProcesses();

  processes.forEach(proc => {
    let line = `${COLORS.bold}${proc.name.padEnd(4)}${COLORS.reset} |---`;
    proc.history.forEach((e, idx) => {
      const badge = `(${e.id}:L${e.clock})`;
      const color = e.type === 'SEND' ? COLORS.magenta : (e.type === 'RECEIVE' ? COLORS.green : COLORS.cyan);
      line += `${color}${badge}${COLORS.reset}---`;
    });
    line += `> (Current Clock: ${proc.clock})`;
    console.log(line);
    console.log('     |');
  });
}

function runScenario(scen) {
  console.log(`\n${COLORS.green}${COLORS.bold}>>> Running Scenario: ${scen.name}${COLORS.reset}`);
  console.log(`${COLORS.dim}${scen.description}${COLORS.reset}\n`);

  const sim = new LamportSimulator();
  scen.run(sim);

  renderSpaceTimeAscii(sim);
  renderEventTable(sim.events);
  renderTotalOrder(sim.getTotalOrder());

  const verification = sim.verifyTheoreticalProperties();
  console.log(`${COLORS.bold}=== Lamport Theoretical Clock Condition Invariant Check ===${COLORS.reset}`);
  console.log(`  Events: ${verification.stats.totalEvents} | Causally Ordered Pairs: ${verification.stats.happensBeforePairs} | Concurrent Pairs: ${verification.stats.concurrentPairs}`);
  if (verification.passed) {
    console.log(`  ${COLORS.green}${COLORS.bold}✔ PASS:${COLORS.reset} For every event pair where a -> b, C(a) < C(b) holds strictly!`);
  } else {
    console.log(`  ${COLORS.red}${COLORS.bold}✖ FAIL:${COLORS.reset} Violations found:`, verification.violations);
  }

  if (verification.educationalDemos.length > 0) {
    console.log(`\n${COLORS.yellow}${COLORS.bold}Educational Note: Lamport Clock Limitation:${COLORS.reset}`);
    const demo = verification.educationalDemos[0];
    console.log(`  Found concurrent events: ${demo.earlier.id} (P${demo.earlier.pid}, L=${demo.earlier.clock}) and ${demo.later.id} (P${demo.later.pid}, L=${demo.later.clock})`);
    console.log(`  Notice: C(${demo.earlier.id}) < C(${demo.later.id}), yet ${demo.earlier.id} || ${demo.later.id} (concurrent)!`);
    console.log(`  ${COLORS.dim}This proves: C(a) < C(b) does NOT imply a -> b (Motivating Vector Clocks).${COLORS.reset}`);
  }
}

function main() {
  printBanner();
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    // Run scenario 1 by default and show help
    runScenario(SCENARIOS[0]);
    console.log('\n-------------------------------------------------------------');
    printHelp();
    return;
  }

  const target = args[0].toLowerCase();
  let scenario = null;

  const num = parseInt(target, 10);
  if (!isNaN(num) && num >= 1 && num <= SCENARIOS.length) {
    scenario = SCENARIOS[num - 1];
  } else {
    scenario = SCENARIOS.find(s => s.id.toLowerCase() === target || s.id.toLowerCase().includes(target));
  }

  if (scenario) {
    runScenario(scenario);
  } else if (target === 'all') {
    SCENARIOS.forEach(s => runScenario(s));
  } else {
    console.log(`${COLORS.red}Unknown scenario: "${target}"${COLORS.reset}`);
    printHelp();
  }
}

if (require.main === module) {
  main();
}
