async function checkAll() {
  const now = Date.now();
  console.log('=== PROBING LIVE HARDWARE CHANNELS ===');
  console.log('Current Timestamp:', now, new Date().toISOString());

  // 1. Firebase RTDB Root Check
  try {
    const rtdbRes = await fetch('https://resq-hardware-default-rtdb.asia-southeast1.firebasedatabase.app/.json');
    const rtdbData = await rtdbRes.json();
    console.log('\n--- 1. FIREBASE REALTIME DATABASE ---');
    console.log('RTDB Root Keys:', rtdbData ? Object.keys(rtdbData) : null);
    if (rtdbData) {
      console.log('RTDB Content:');
      console.dir(rtdbData, { depth: null });
    }
  } catch (e) {
    console.error('RTDB Error:', e.message);
  }

  // 2. Render Cloud Backend Check
  try {
    const backendRes = await fetch('https://resq-mesh-backend.onrender.com/api/state');
    const backendData = await backendRes.json();
    console.log('\n--- 2. RENDER CLOUD BACKEND ---');
    const n = backendData.nodes || {};
    for (const [id, node] of Object.entries(n)) {
      const ls = node.last_seen;
      const lsMs = ls > 1e11 ? ls : ls * 1000;
      const agoSec = Math.round((now - lsMs) / 1000);
      console.log(`Node [${id}] (${node.name}): status=${node.status}, last_seen=${agoSec}s ago (${(agoSec/60).toFixed(1)} mins ago)`);
      console.log(`   Temp: ${node.temp}°C | Gas: ${node.gas} ppm | Batt: ${node.battery}% | Motion: ${node.motion}`);
    }
    console.log('Emergency:', backendData.emergency);
    console.log('Exits:', backendData.exits);
  } catch (e) {
    console.error('Backend Error:', e.message);
  }
}
checkAll();

