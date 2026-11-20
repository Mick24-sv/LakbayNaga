import AttractionStoryCard from '../../components/attractions/AttractionStoryCard.jsx';
import { useState } from 'react';
import {
  categories,
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
    <main className="attractions-page" data-navigation-loading={loading}>
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
              <AttractionStoryCard key={place.id} place={place} />
            ))}
          </div>
        )}
      </section>


    </main>
  );
}

