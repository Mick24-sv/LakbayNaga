import { useEffect, useState } from 'react';


export const categories = [
  'Faith & heritage',
  'City spaces',
  'Culture & history',
  'Nature & outdoors'
];


export function formatFee(cost) {
  if (
    cost === '' ||
    cost == null ||
    !Number.isFinite(Number(cost)) ||
    Number(cost) < 0
  ) {
    return 'Confirm fee';
  }


  return Number(cost) === 0
    ? 'Free'
    : new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 2
      }).format(Number(cost));
}


export function useAttractions() {
  const [filters, setFilters] = useState({ q: '', category: '' });
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    const controller = new AbortController();


    setLoading(true);
    setError('');


    async function load() {
      try {
        const query = new URLSearchParams(filters);


        const response = await fetch('/api/attractions?' + query, {
          signal: controller.signal
        });


        const data = await response.json();


        if (!response.ok || !Array.isArray(data)) {
          throw new Error('Unable to load attractions.');
        }


        setPlaces(data);
      } catch {
        if (!controller.signal.aborted) {
          setError('Could not load attractions. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }


    load();
    return () => controller.abort();
  }, [filters]);


  return {
    places,
    filters,
    loading,
    error,
    search: (q, category) => setFilters({
      q: q.trim(),
      category
    }),
    retry: () => setFilters(current => ({ ...current }))
  };
}