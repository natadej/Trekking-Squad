/** Counts steps with the phone's motion sensor: one step per bounce in acceleration, at most ~3 per second. */
export async function startMotionSteps(onStep: () => void): Promise<(() => void) | null> {
  const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (!DM) return null;
  if (typeof DM.requestPermission === 'function') {
    try { if ((await DM.requestPermission()) !== 'granted') return null; } catch { return null; }
  }
  let avg = 9.8, up = false, last = 0;
  const h = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const m = Math.hypot(a.x, a.y ?? 0, a.z ?? 0);
    avg = avg * 0.92 + m * 0.08;
    const d = m - avg, t = performance.now();
    if (!up && d > 1.4) {
      up = true;
      if (t - last > 300) { last = t; onStep(); }
    } else if (up && d < 0.3) up = false;
  };
  window.addEventListener('devicemotion', h);
  return () => window.removeEventListener('devicemotion', h);
}
