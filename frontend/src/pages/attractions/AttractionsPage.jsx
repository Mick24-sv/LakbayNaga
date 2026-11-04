import { useState } from 'react';
import {
  categories,
  formatFee,
  useAttractions
} from './attractionsLogic.js';
import './AttractionsPage.css';


export default function AttractionsPage() {
  const [query, setQuery] = useState('');


  const {
    places,
    filters,
    loading,
    error,
    search,
    retry
  } = useAttractions();


  function clear() {
    setQuery('');
    search('', '');
  }


  function submit(event) {
    event.preventDefault();
    search(query, filters.category);
  }


  return (
    <main className="attractions-page">
      <header className="attractions-heading">
        <span>NAGA CITY, CAMARINES SUR</span>
        <h1>Explore Naga</h1>
        <p>
          Find places to visit, discover local favorites, and
          prepare for your day.
        </p>
      </header>


      <form className="attractions-search" onSubmit={submit}>
        <label htmlFor="attraction-search">
          Search places
          <input
            id="attraction-search"
            type="search"
            placeholder="Try a landmark, area, or plaza"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </label>


        <label htmlFor="attraction-category">
          Category
          <select
            id="attraction-category"
            value={filters.category}
            onChange={event => search(query, event.target.value)}
          >
            <option value="">All categories</option>


            {categories.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>


        <button className="attractions-primary" type="submit">
          Search places
        </button>
      </form>


      <section
        aria-labelledby="attraction-results-title"
        aria-busy={loading}
      >
        <div className="attractions-results-heading">
          <h2 id="attraction-results-title">Places to discover</h2>


          <p role="status">
            {loading
              ? 'Loading places...'
              : error
                ? 'Results unavailable'
                : places.length +
                  (places.length === 1
                    ? ' place found'
                    : ' places found')}
          </p>
        </div>


        {(filters.q || filters.category) && (
          <div className="attractions-active-filters">
            <span>
              {filters.q && 'Search: ' + filters.q}
              {filters.q && filters.category && ' / '}
              {filters.category}
            </span>


            <button type="button" onClick={clear}>
              Clear filters
            </button>
          </div>
        )}


        {loading ? (
          <div className="attractions-state">
            Finding places for your visit...
          </div>
        ) : error ? (
          <div className="attractions-state">
            <p role="alert">{error}</p>


            <button
              className="attractions-secondary"
              type="button"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        ) : places.length === 0 ? (
          <div className="attractions-state">
            <h3>No places found</h3>
            <p>Try another keyword or category.</p>


            <button
              className="attractions-secondary"
              type="button"
              onClick={clear}
            >
              Reset search
            </button>
          </div>
        ) : (
          <div className="attractions-grid">
            {places.map(place => (
              <article className="attraction-card" key={place.id}>
                <span className="attraction-category">
                  {place.category}
                </span>


                <h3>{place.name}</h3>


                <p className="attraction-location">
                  <Pin />
                  {place.area || 'Naga City'}
                </p>


                <p className="attraction-description">
                  {place.description}
                </p>


                <dl className="attraction-facts">
                  <div>
                    <dt>Estimated entrance fee</dt>
                    <dd>{formatFee(place.cost)}</dd>
                  </div>


                  <div>
                    <dt>Visit duration</dt>
                    <dd>
                      {place.duration
                        ? place.duration + ' min'
                        : 'Varies'}
                    </dd>
                  </div>
                </dl>

                <a
                  className="attractions-secondary attraction-details-link"
                  href={'#place/' + encodeURIComponent(place.id)}
                >
                  View place
                  <span aria-hidden="true">&#8594;</span>
                </a>
                
                <a
                  className="attractions-secondary"
                  href={
                    'https://www.google.com/maps/search/?api=1&query=' +
                    encodeURIComponent(
                      place.name + ' Naga City Philippines'
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Find on map
                  <span aria-hidden="true">&#8599;</span>
                </a>
              </article>
            ))}
          </div>
        )}
      </section>


      <p className="attractions-note">
        Fees and durations are estimates. Confirm current visitor
        information directly with the attraction.
      </p>
    </main>
  );
}


function Pin() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}