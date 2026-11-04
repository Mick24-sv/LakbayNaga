import { useEffect, useState } from "react";

export function useHomeAttractions() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    category: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams(filters);
        const response = await fetch("/api/attractions?" + query, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load places.");
        }

        if (!Array.isArray(data)) {
          throw new Error("Unexpected attraction response.");
        }

        setPlaces(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Could not load places. Please try again.");
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
    loading,
    error,
    filters,
    search: (q, category = "") => setFilters({ q, category }),
    retry: () => setFilters((current) => ({ ...current })),
  };
}

export function formatFee(cost) {
  if (cost === undefined || cost === null || cost === "") {
    return "Check fee";
  }

  const amount = Number(cost);

  if (!Number.isFinite(amount) || amount < 0) {
    return "Check fee";
  }

  return amount === 0
    ? "Free"
    : new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
      }).format(amount);
}
