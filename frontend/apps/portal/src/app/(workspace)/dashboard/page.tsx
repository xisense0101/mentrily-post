import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <section style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#52606d',
          }}
        >
          Workspace
        </p>
        <h2 style={{ margin: '0.5rem 0 1rem', fontSize: '2rem' }}>Dashboard</h2>
        <p style={{ maxWidth: '44rem', lineHeight: 1.7 }}>
          The restored portal workspace brings the core learning, content, assessment, grading, and
          media surfaces back together for the next implementation milestones.
        </p>
        <p style={{ maxWidth: '44rem', lineHeight: 1.7 }}>
          The portal app is restored with a minimal workspace shell and verified routes for the
          restored modules.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <div
          style={{
            border: '1px solid #d7dfe6',
            borderRadius: '18px',
            padding: '1rem',
            background: '#fff',
          }}
          data-testid="learning-nav-card"
        >
          <h3 style={{ marginTop: 0 }}>Learning Delivery</h3>
          <p style={{ marginTop: 0, color: '#52606d' }}>
            Create, publish, and track courses and learner progress.
          </p>
          <Link href="/learning">Open Learning</Link>
        </div>
        <div
          style={{
            border: '1px solid #d7dfe6',
            borderRadius: '18px',
            padding: '1rem',
            background: '#fff',
          }}
          data-testid="content-nav-card"
        >
          <h3 style={{ marginTop: 0 }}>Content Studio</h3>
          <p style={{ marginTop: 0, color: '#52606d' }}>
            Build, publish, and restore reusable content documents.
          </p>
          <Link href="/content">Open Content</Link>
        </div>
        <div
          style={{
            border: '1px solid #d7dfe6',
            borderRadius: '18px',
            padding: '1rem',
            background: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Assessments</h3>
          <p style={{ marginTop: 0, color: '#52606d' }}>
            Draft, publish, and manage assessment authoring workflows.
          </p>
          <Link href="/assessments">Open Assessments</Link>
        </div>
        <div
          style={{
            border: '1px solid #d7dfe6',
            borderRadius: '18px',
            padding: '1rem',
            background: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Grading</h3>
          <p style={{ marginTop: 0, color: '#52606d' }}>
            Review manual grading queues and grading runs.
          </p>
          <Link href="/grading/manual-review">Open Grading</Link>
        </div>
        <div
          style={{
            border: '1px solid #d7dfe6',
            borderRadius: '18px',
            padding: '1rem',
            background: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Media Library</h3>
          <p style={{ marginTop: 0, color: '#52606d' }}>
            Upload and manage private workspace media assets.
          </p>
          <Link href="/media">Open Media</Link>
        </div>
      </div>
    </section>
  );
}
