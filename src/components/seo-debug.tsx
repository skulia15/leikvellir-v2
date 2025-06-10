import { env } from '~/env';
interface SEOTestProps {
    playground?: {
        id: string;
        name: string;
        description?: string | null;
        municipality?: string | null;

    };
}
export function SEODebugInfo({ playground }: SEOTestProps) {
    if (process.env.NODE_ENV !== 'development') {
        return null;

    }
    const BASE_URL = env.NEXT_PUBLIC_BASE_URL || 'https://leiksvæði.is';
    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
            <h3 className="font-bold mb-2">SEO Debug Info</h3>
            <div className="space-y-1">
                <p><strong>Base URL:</strong> {BASE_URL}</p>
                <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'SSR'}</p>

                {playground && (
                    <>
                        <p><strong>OG Image:</strong> {playground.id ? `${BASE_URL}/playground/${playground.id}/og-image` : 'Default'}</p>
                        <p><strong>Title:</strong> {playground.name} | Leikvellir</p>
                        <p><strong>Description:</strong> {playground.description?.slice(0, 50)}...</p>
                    </>
                )}

                <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="font-semibold">SEO Tests:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>✅ Metadata system</li>
                        <li>✅ Open Graph tags</li>
                        <li>✅ Structured data</li>
                        <li>✅ Sitemap</li>
                        <li>❌ Logo/favicon files</li>
                    </ul>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="font-semibold">Test URLs:</p>
                    <ul className="space-y-1">
                        <li><a href="/sitemap.xml" target="_blank" className="text-blue-300 hover:underline">Sitemap</a></li>
                        <li><a href="/robots.txt" target="_blank" className="text-blue-300 hover:underline">Robots.txt</a></li>
                        <li><a href="/og-image" target="_blank" className="text-blue-300 hover:underline">OG Image</a></li>
                        <li><a href="/manifest.json" target="_blank" className="text-blue-300 hover:underline">Manifest</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
// Helper component to add to layout for debugging
export function SEODebugPanel() {
    if (process.env.NODE_ENV !== 'development') {
        return null;

    }
    return <SEODebugInfo />;
}
