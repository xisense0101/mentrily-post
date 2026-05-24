import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/learning', label: 'Learning' },
  { href: '/content', label: 'Content Studio' },
  { href: '/assessments', label: 'Assessments' },
  { href: '/grading/manual-review', label: 'Grading' },
  { href: '/media', label: 'Media' },
  { href: '/settings/notifications', label: 'Notification Settings' },
];

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr' }}>
      <aside
        style={{
          padding: '2rem 1.25rem',
          background: 'linear-gradient(180deg, rgba(31,41,51,1) 0%, rgba(16,24,40,1) 100%)',
          color: '#f8fafc',
        }}
      >
        <div style={{ fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Mentrily
        </div>
        <h1 style={{ margin: '0.5rem 0 2rem', fontSize: '1.75rem' }}>Workspace</h1>
        <nav aria-label="Workspace navigation" style={{ display: 'grid', gap: '0.75rem' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ padding: '2rem 2.5rem' }}>{children}</main>
    </div>
  );
}
