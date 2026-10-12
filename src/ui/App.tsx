// Single-screen shell. Copy must never claim a home is "safe".
export function App() {
  return (
    <main className="shell">
      <h1>Kid-Proof</h1>
      <p className="notice">Not a guarantee of safety.</p>
      <a className="call" href="tel:+18002221222">
        Poison Help 1-800-222-1222
      </a>
    </main>
  );
}
