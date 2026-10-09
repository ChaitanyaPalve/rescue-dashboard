async function run() {
  try {
    const res = await fetch('https://resq-mesh-backend.onrender.com/api/state');
    const s = await res.json();
    const now = Date.now() / 1000;
    console.log('=== BACKEND LIVE STATUS ===');
    console.log('Current Timestamp:', Math.round(now));
    console.log('System Status:', s.system_status || 'NOMINAL');
    console.log('\n--- NODES TELEMETRY ---');
    for (const [id, node] of Object.entries(s.nodes || {})) {
      const ago = Math.round(now - (node.last_seen || 0));
      console.log(`Node [${id}] - ${node.name} (${node.zone || 'No Zone'}):`);
      console.log(`  Last Received: ${ago} seconds ago (${(ago/60).toFixed(1)} mins ago)`);
      console.log(`  Readings -> Temp: ${node.temp}°C | Gas: ${node.gas} ppm | Battery: ${node.battery}% | Motion: ${node.motion}`);
      if (node.peopleInside !== undefined) console.log(`  People Inside: ${node.peopleInside}`);
      if (node.accelX !== undefined) console.log(`  Structural AccelX: ${node.accelX}`);
    }

    console.log('\n--- EXITS & ROUTING ---');
    console.log('Exit A (South):', s.exits?.EXIT_A?.blocked ? 'BLOCKED ⛔' : 'OPEN / SAFE 🟢');
    console.log('Exit B (North):', s.exits?.EXIT_B?.blocked ? 'BLOCKED ⛔' : 'OPEN / SAFE 🟢');

    console.log('\n--- EMERGENCY STATE ---');
    console.log('Active:', s.emergency?.active ? '🚨 EMERGENCY ACTIVE' : '🟢 NOMINAL (SAFE)');
    if (s.emergency?.active) {
      console.log('Node:', s.emergency.node);
      console.log('Type:', s.emergency.type);
      console.log('Category:', s.emergency.event_category);
    }

    console.log('\n--- AI HAZARD ASSESSMENT ---');
    if (s.last_ai_result) {
      console.log('Impact Hazard Zone:', s.last_ai_result.primary_hazard_zone);
      console.log('Evacuation Recommendation:', s.last_ai_result.evacuation_recommendation?.primary_exit);
      console.log('Risk Assessment:', s.last_ai_result.risk_assessment);
    } else {
      console.log('No AI result recorded');
    }
  } catch (err) {
    console.error('Error fetching state:', err.message);
  }
}
run();

