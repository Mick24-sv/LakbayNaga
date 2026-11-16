// Shared by the homepage and the admin crop-layout measurement.
export default function HomeHero({ siteImages = {}, query = '', onQueryChange = () => {}, onSubmit = event => event.preventDefault(), idPrefix = 'home-' }) {
  return (
    <section className="home-hero" aria-labelledby={idPrefix + 'title'}>
        {siteImages.homepageBanner && (
          <>
            <img className="home-hero-photo" src={siteImages.homepageBanner} alt="" />
            <div className="home-hero-shade" aria-hidden="true" />
          </>
        )}
        <div className="home-container home-hero-content">
          <span className="home-badge">
            Heritage, faith, and local discoveries
          </span>

          <h1 id={idPrefix + 'title'}>
            A welcoming city,
            <br />
            rooted in local character.
          </h1>

          <p>Discover Naga and find places for your next visit.</p>

          <form className="home-search" onSubmit={onSubmit}>
            <label className="home-sr-only" htmlFor={idPrefix + 'search'}>
              Search attractions
            </label>

            <input
              id={idPrefix + 'search'}
              type="search"
              placeholder="Search basilica, plazas, landmarks..."
              value={query}
              onChange={event => onQueryChange(event.target.value)}
            />

            <button type="submit" className="home-button">
              Search
            </button>
          </form>
        </div>
      </section>
  );
}
