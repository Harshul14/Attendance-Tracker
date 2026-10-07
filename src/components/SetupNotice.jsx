export default function SetupNotice({ missing }) {
  return (
    <main className="panel panel--narrow">
      <h2>Firebase is not configured</h2>
      <p>
        This build is missing the following environment variables. Copy <code>.env.example</code> to{' '}
        <code>.env</code> (local) or add them as GitHub repository secrets (deployment).
      </p>
      <ul className="code-list">
        {missing.map((name) => (
          <li key={name}><code>{name}</code></li>
        ))}
      </ul>
    </main>
  );
}
