// Temporary debug page to check base URL detection
// Visit /debug-seo to see current configuration

import { getBaseUrl } from '~/lib/seo/base-url';
import { env } from '~/env';

export default function DebugSEO() {
  const baseUrl = getBaseUrl();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">SEO Debug Information</h1>

      <div className="bg-gray-100 p-4 rounded-lg space-y-2">
        <p><strong>Detected Base URL:</strong> <code className="bg-white px-2 py-1 rounded">{baseUrl}</code></p>
        <p><strong>NODE_ENV:</strong> <code className="bg-white px-2 py-1 rounded">{process.env.NODE_ENV}</code></p>
        <p><strong>NEXT_PUBLIC_BASE_URL:</strong> <code className="bg-white px-2 py-1 rounded">{env.NEXT_PUBLIC_BASE_URL || 'Not set'}</code></p>
        <p><strong>VERCEL_URL:</strong> <code className="bg-white px-2 py-1 rounded">{process.env.VERCEL_URL || 'Not set'}</code></p>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Test Links</h2>
        <ul className="space-y-2">
          <li><a href="/sitemap.xml" target="_blank" className="text-blue-600 hover:underline">→ View Sitemap</a></li>
          <li><a href="/og-image" target="_blank" className="text-blue-600 hover:underline">→ View OG Image</a></li>
          <li><a href="/manifest.json" target="_blank" className="text-blue-600 hover:underline">→ View Manifest</a></li>
          <li><a href="/robots.txt" target="_blank" className="text-blue-600 hover:underline">→ View Robots.txt</a></li>
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Expected vs Actual</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-medium text-green-800 mb-2">✅ Expected</h3>
            <code className="text-sm">https://leiksvæði.is</code>
          </div>
          <div className={`p-4 rounded ${baseUrl.includes('leiksvæði.is') ? 'bg-green-50' : 'bg-red-50'}`}>
            <h3 className={`font-medium mb-2 ${baseUrl.includes('leiksvæði.is') ? 'text-green-800' : 'text-red-800'}`}>
              {baseUrl.includes('leiksvæði.is') ? '✅' : '❌'} Actual
            </h3>
            <code className="text-sm">{baseUrl}</code>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>If the actual URL does&apos;t match expected, update NEXT_PUBLIC_BASE_URL in Vercel and redeploy.</p>
      </div>
    </div>
  );
}
