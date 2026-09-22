import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8f5ef', color: '#283e35', padding: 76, flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontSize: 62, fontWeight: 700 }}>SRI</span>
        <span style={{ fontSize: 28, padding: '12px 20px', background: '#d5e1d6', letterSpacing: 4 }}>BOUTIQUE</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 88, letterSpacing: -4 }}>Style, your way.</span>
        <span style={{ fontSize: 30, marginTop: 22, color: '#677c6f' }}>Sarees, everyday favourites &amp; occasion-ready edits.</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, borderTop: '1px solid #b9c9bd', paddingTop: 24 }}>
        <span>Curated in Chennai</span><span>Discover your next favourite</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
