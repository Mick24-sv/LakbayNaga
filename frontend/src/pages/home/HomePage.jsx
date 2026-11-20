import { useState } from 'react';
import { useHomeAttractions } from './homeLogic.js';
import HomeHero from './HomeHero.jsx';
import './HomePage.css';

const interests = [
  'All places',
  'Faith & heritage',
  'City spaces',
  'Culture & history',
  'Nature & outdoors'
];

const benefits = [
  ['Discover places', 'Heritage, faith, and everyday favorites.', '✦'],
  ['Know the costs', 'Prepare for your day with estimates.', '₱'],
  ['Plan your days', 'A day-by-day plan that fits your budget.', '▦']
];

export default function HomePage({ siteImages = {} }) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const {
    places,
    loading,
    error,
    filters,
    search,
    retry
  } = useHomeAttractions();

  const visiblePlaces = showAll ? places : places.slice(0, 3);

  function submitSearch(event) {
    event.preventDefault();
    setShowAll(true);
    search(query.trim(), filters.category);

    document.getElementById('home-places')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches ? 'auto' : 'smooth'
    });
  }

  function chooseInterest(category) {
    setShowAll(true);
    search(query.trim(), category === 'All places' ? '' : category);
  }

  function clearFilters() {
    setQuery('');
    setShowAll(false);
    search('');
  }

  return (
    <div className="home-page">
      <HomeHero siteImages={siteImages} query={query} onQueryChange={setQuery} onSubmit={submitSearch} />

      <div className="home-container home-content">
        <section className="home-benefits" aria-label="Why explore Naga">
          {benefits.map(([title, description, icon], index) => (
            <article key={title}>
              <span className={`home-benefit-icon home-benefit-icon-${index + 1}`} aria-hidden="true">
                {icon}
              </span>

              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="home-interests" aria-labelledby="interest-title">
          <h2 id="interest-title">Browse by interest</h2>

          <div className="home-chips">
            {interests.map(category => {
              const value = category === 'All places' ? '' : category;

              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={filters.category === value}
                  onClick={() => chooseInterest(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <section id="home-places" aria-labelledby="places-title">
          <div className="home-section-heading">
            <div>
              <span className="home-kicker">Discover Naga</span>
              <h2 id="places-title">Places worth the trip</h2>
            </div>

            {!showAll && places.length > 3 && (
              <button
                type="button"
                className="home-secondary-button"
                onClick={() => setShowAll(true)}
              >
                Show all places
              </button>
            )}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {loading && <p className="home-message">Loading places...</p>}

            {!loading && error && (
              <div className="home-message home-error">
                <p role="alert">{error}</p>
                <button
                  type="button"
                  className="home-secondary-button"
                  onClick={retry}
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && places.length === 0 && (
              <div className="home-message">
                <h3>No places found</h3>
                <p>Try another search or interest.</p>
                <button
                  type="button"
                  className="home-secondary-button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {!loading && !error && places.length > 0 && (
            <>
              <div className="home-place-grid">
                {visiblePlaces.map(place => (
                  <article className="home-place-card" key={place.id}>
                    {place.imageUrl && (
                      <img
                        className="home-place-card-photo"
                        src={place.imageUrl}
                        alt={place.name}
                        loading="lazy"
                      />
                    )}
                    <span className="home-category">{place.category}</span>

                    <h3>{place.name}</h3>
                    <p className="home-location">
                      {place.area || 'Naga City'}
                    </p>
                    <p>{place.description}</p>

                  </article>
                ))}
              </div>

            </>
          )}
        </section>
      </div>
    </div>
  );
}
