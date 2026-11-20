import { useState } from 'react';
import { teamMembers } from './teamMembers.js';
import './AboutPage.css';

function TeamPortrait({ member }) {
  const [failed, setFailed] = useState(false);
  return <div className="about-portrait">
    <span aria-hidden="true">{member.initials}</span>
    {!failed && <img src={member.photo} alt={member.name} loading="lazy" onError={() => setFailed(true)} />}
  </div>;
}

export default function AboutPage() {
  return <main className="about-page">
    <section className="about-hero" aria-labelledby="about-title">
      <div className="about-wrap about-hero-grid">
        <div className="about-hero-copy">
          <p className="about-eyebrow"><span /> OUR CITY. YOUR NEXT STORY.</p>
          <h1 id="about-title">A little curiosity.<br />A lot to <em>discover.</em></h1>
          <p className="about-lead">Meet LakbayNaga, your companion for discovering Naga City and turning places you want to visit into days you can look forward to.</p>
          <a className="about-link" href="#explore">Get to know Naga <span aria-hidden="true">&rarr;</span></a>
        </div>
        <div className="about-postcard" aria-hidden="true">
          <div className="about-postcard-top"><span>NAGA CITY</span><span>13.62&deg; N &middot; 123.19&deg; E</span></div>
          <div className="about-scene">
            <div className="about-sun" /><div className="about-cloud" />
            <div className="about-hill about-hill-back" /><div className="about-hill about-hill-front" />
            <svg className="about-route" viewBox="0 0 360 220" fill="none"><path d="M70 183C40 110 220 160 193 96S300 62 293 24" stroke="white" strokeWidth="3" strokeDasharray="7 8" /><circle cx="70" cy="183" r="8" fill="#f6c64b" stroke="white" strokeWidth="3"/><circle cx="293" cy="24" r="8" fill="#ed665b" stroke="white" strokeWidth="3"/></svg>
            <span className="about-scene-note">Good days start<br />with a little lakbay.</span>
          </div>
          <div className="about-postcard-bottom"><strong>Made for local discoveries.</strong><span>Faith &middot; Culture &middot; Nature</span></div>
        </div>
      </div>
    </section>

    <section className="about-wrap about-purpose" aria-labelledby="about-purpose-title">
      <div><p className="about-eyebrow">WHY WE BUILT IT</p><h2 id="about-purpose-title">Less guesswork.<br />More exploring.</h2></div>
      <p>LakbayNaga is a student-built travel planning project. We bring attraction information and itinerary planning together to make exploring Naga easier, while highlighting the city's heritage, culture, and local favorites.</p>
    </section>

    <section className="about-wrap about-features" aria-label="What you can do with LakbayNaga">
      <article className="about-feature about-blue"><span className="about-feature-number">01</span><h3>Find your next stop.</h3><p>Browse attractions, photos, locations, and estimated entrance fees.</p><a href="#explore">Discover places <span aria-hidden="true">&#8599;</span></a></article>
      <article className="about-feature about-green"><span className="about-feature-number">02</span><h3>Make the day yours.</h3><p>Build an itinerary around your budget, available time, and interests.</p><a href="#planner">Plan a trip <span aria-hidden="true">&#8599;</span></a></article>
      <article className="about-feature about-yellow"><span className="about-feature-number">03</span><h3>Keep the good plans.</h3><p>Save your itineraries and come back when you're ready for your next visit.</p><a href="#trips">View saved trips <span aria-hidden="true">&#8599;</span></a></article>
    </section>

    <section className="about-team-section" aria-labelledby="about-team-title">
      <div className="about-wrap">
        <div className="about-team-heading"><p className="about-eyebrow">THE PEOPLE BEHIND THE PLANS</p><h2 id="about-team-title">One team. A shared curiosity.</h2><p>The developers behind LakbayNaga.</p></div>
        <ul className="about-team-grid">
          {teamMembers.map(member => <li key={member.name} className={'about-member about-' + member.color}>
            <TeamPortrait member={member} /><h3>{member.name}</h3><p>{member.role}</p>
          </li>)}
        </ul>
      </div>
    </section>

    <section className="about-wrap about-closing" aria-labelledby="about-closing-title">
      <div><p className="about-eyebrow">YOUR NEXT CHAPTER</p><h2 id="about-closing-title">See where the day takes you.</h2><p>A familiar place or a new favorite. Start exploring Naga.</p></div>
      <a className="about-link" href="#planner">Let's plan your trip <span aria-hidden="true">&rarr;</span></a>
    </section>
    <p className="about-project-note">An independent student project. Attraction fees, opening hours, and travel estimates may change. Please confirm details before your visit.</p>
  </main>;
}
