import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '3rem' }}>
      <h1 style={{ marginTop: 0 }}>Mentrily Portal</h1>
      <p style={{ maxWidth: '40rem', lineHeight: 1.6 }}>
        Portal workspace foundation restored. Use the workspace area to access product modules as
        they are implemented.
      </p>
      <Link href="/dashboard">Open workspace</Link>
    </main>
  );
}
