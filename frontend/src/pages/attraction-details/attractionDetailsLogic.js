import { useEffect, useState } from 'react';


export function useAttractionDetails(encodedId) {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);


  useEffect(() => {
    const controller = new AbortController();


    setLoading(true);
    setError('');
    setPlace(null);


    async function load() {
      try {
        let id;


        try {
          id = decodeURIComponent(encodedId);
        } catch {
          throw new Error('This attraction link is invalid.');
        }


        // The starter currently provides a public collection endpoint.
        const response = await fetch('/api/attractions', {
          signal: controller.signal
        });


        if (!response.ok) {
          throw new Error('Could not load this attraction.');
        }


        const places = await response.json();


        if (!Array.isArray(places)) {
          throw new Error('Unexpected attraction response.');
        }


        setPlace(
          places.find(item => String(item.id) === id) || null
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? 'Unable to connect. Please try again.'
              : err.message
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }


    load();


    return () => controller.abort();
  }, [encodedId, attempt]);


  return {
    place,
    loading,
    error,
    retry: () => setAttempt(current => current + 1)
  };
}


export function attractionPhoto(url) {
  if (typeof url !== 'string') return '';


  // Match the local image paths supported by the finished system.
  return /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url) ||
    /^\/api\/images\/[a-f0-9]{32}$/.test(url)
    ? url
    : '';
}