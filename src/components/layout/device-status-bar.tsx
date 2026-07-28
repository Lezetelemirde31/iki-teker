/**
 * Simulated OS status bar — rendered only in the desktop device frame (hidden by
 * CSS below 528px, where the real phone draws its own). The time is fixed at
 * 9:41 to match the source prototype, which also keeps it deterministic between
 * server and client render.
 */
export function DeviceStatusBar() {
  return (
    <div
      className="device-status text-foreground z-50 flex shrink-0 items-center justify-between px-7 pt-3.5 pb-1 text-[0.8125rem] font-semibold"
      aria-hidden
    >
      <span className="tabular">9:41</span>

      <span className="flex items-center gap-1.5">
        <span className="text-[0.6875rem] font-medium">Bakı · 5G</span>
        <SignalBars />
        <Battery />
      </span>
    </div>
  );
}

function SignalBars() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" role="presentation">
      <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
      <rect x="4.6" y="5.2" width="3" height="5.8" rx="1" />
      <rect x="9.2" y="2.6" width="3" height="8.4" rx="1" />
      <rect x="13.8" y="0" width="3" height="11" rx="1" />
    </svg>
  );
}

function Battery() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" role="presentation">
      <rect x="0.5" y="0.5" width="21" height="11" rx="3.2" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
      <path
        d="M23 4.2v3.6c.9-.3 1.5-1 1.5-1.8S23.9 4.5 23 4.2Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}
