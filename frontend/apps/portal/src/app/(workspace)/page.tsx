import Link from 'next/link';

export default function WorkspaceHomePage() {
  return (
    <section>
      <h2 style={{ marginTop: 0 }}>Workspace Home</h2>
      <p style={{ maxWidth: '44rem', lineHeight: 1.6 }}>
        This workspace shell exists so roadmap frontend modules can land on a stable app boundary.
      </p>
      <Link href="/dashboard">Go to dashboard</Link>
    </section>
  );
}
