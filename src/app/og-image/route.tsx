import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  // TODO: get a non AI garbage OG Image
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(45deg, #f0fdf4 0%, #dcfce7 100%)',
          }}
        >
          {/* Main logo/text */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px',
            }}
          >
            {/* Playground icon */}
            <div
              style={{
                width: '120px',
                height: '120px',
                backgroundColor: '#10b981',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '24px',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
              }}
            >
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="white"
              >
                {/* Swing set icon */}
                <path d="M12 2L10 10V22H6V20L8 12L12 2ZM14 10L16 2L20 12L22 20V22H18V10L16 2L14 10ZM12 14L16 18L12 22L8 18L12 14Z" />
              </svg>
            </div>

            {/* Title */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <h1
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#064e3b',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Leiksvæði
              </h1>
              <p
                style={{
                  fontSize: '28px',
                  color: '#059669',
                  margin: 0,
                  marginTop: '8px',
                }}
              >
                Leiksvæði á Íslandi
              </p>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '24px',
              color: '#374151',
              textAlign: 'center',
              maxWidth: '800px',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Finndu og kortleggðu leiksvæði víðsvegar um landið
          </p>

          {/* Bottom decoration */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              right: '40px',
              height: '4px',
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              borderRadius: '2px',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('Failed to generate OG image:', e);
    return new Response('Failed to generate image', {
      status: 500,
    });
  }
}
