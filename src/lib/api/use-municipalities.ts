import { useEffect, useState } from 'react';
import { fetchMunicipalities, type Municipality } from './municipalities';

interface UseMunicipalitiesResult {
  municipalities: Municipality[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMunicipalities(): UseMunicipalitiesResult {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMunicipalities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMunicipalities();
      if (data.length === 0) {
        setError("No municipalities found");
      } else {
        setMunicipalities(data);
      }
    } catch (err) {
      console.error("Failed to load municipalities:", err);
      setError("Failed to load municipalities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMunicipalities();
  }, []);

  return {
    municipalities,
    loading,
    error,
    refetch: loadMunicipalities,
  };
}

// Preload municipalities for better UX
export function preloadMunicipalities(): void {
  if (typeof window !== 'undefined') {
    // Only preload in the browser
    fetchMunicipalities().catch(err => {
      console.warn('Failed to preload municipalities:', err);
    });
  }
}
