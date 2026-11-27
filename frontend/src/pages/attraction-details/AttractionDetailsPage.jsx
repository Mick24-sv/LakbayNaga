import { useRef, useState } from 'react';
import { accountRequest } from '../authentication/accountLogic.js';
import AttractionGallery from '../../components/media/AttractionGallery.jsx';
import { formatFee } from '../attractions/attractionsLogic.js';
import {
  attractionPhoto,
  useAttractionDetails
} from './attractionDetailsLogic.js';
import './AttractionDetailsPage.css';


const savedKey = userId => 'lakbaynaga.savedPlaces.v2.' + userId;


function readSavedPlaces(userId) {
  const data = JSON.parse(localStorage.getItem(savedKey(userId)) || '[]');


  return Array.isArray(data)
    ? data.filter(item => item && typeof item.id === 'string')
    : [];
}


export default function AttractionDetailsPage({ attractionId, user, checkingSession, onNeedLogin }) {
  const { place, loading, error, retry } =
    useAttractionDetails(attractionId);


  if (loading) {
    return (
      <main className="place-details" data-navigation-loading="true">
        <p className="place-state" role="status">
          Loading attraction...
        </p>
      </main>
    );
  }


  if (error) {
    return (
      <main className="place-details">
        <div className="place-state">
          <p role="alert">{error}</p>
          <button
            className="place-button"
            type="button"
            onClick={retry}
          >
            Try again
          </button>
          <a className="place-button" href="#explore">
            Back to Explore Naga
          </a>
        </div>
      </main>
    );
  }


  if (!place) {
    return (
      <main className="place-details">
        <div className="place-state">
          <h1>Attraction not found</h1>
          <p>This place may no longer be available.</p>
          <a className="place-button" href="#explore">
            Back to Explore Naga
          </a>
        </div>
      </main>
    );
  }


  return <PlaceContent key={place.id + (user?.id || 'guest')} place={place} user={user} checkingSession={checkingSession} onNeedLogin={onNeedLogin} />;
}


function PlaceContent({ place, user, checkingSession, onNeedLogin }) {
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [saved, setSaved] = useState(() => {
    try {
      return !!user?.id && readSavedPlaces(user.id).some(item => item.id === place.id);
    } catch {
      return false;
    }
  });


  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');


  const photo = attractionPhoto(place.imageUrl);
  const photos = [...new Set([
    photo,
    ...(Array.isArray(place.galleryImages) ? place.galleryImages : [])
      .map(attractionPhoto)
  ].filter(Boolean))];


  const paragraphs =
    Array.isArray(place.paragraphs) && place.paragraphs.length
      ? place.paragraphs
      : [place.description || 'Visitor information is not available yet.'];


  const mapUrl =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(place.name + ' Naga City Philippines');


  async function toggleSaved() {
    if (checkingSession || saveLock.current) return;
    if (!user?.id) { onNeedLogin(); return; }
    saveLock.current = true;
    setSaving(true);
    setSaveError('');
    setMessage('');


    try {
      const session = await accountRequest('/auth/me');
      if (!session?.user || session.user.id !== user.id) {
        setSaved(false);
        onNeedLogin();
        return;
      }
      const existing = readSavedPlaces(user.id);
      const wasSaved = existing.some(item => item.id === place.id);


      const next = wasSaved
        ? existing.filter(item => item.id !== place.id)
        : [{ id: place.id, at: Date.now() }, ...existing];


      localStorage.setItem(savedKey(user.id), JSON.stringify(next));
      setSaved(!wasSaved);


      setMessage(
        place.name +
          (wasSaved
            ? ' was removed from your saved places.'
            : ' was added to your saved places in this browser.')
      );
    } catch {
      setSaveError(
        'Could not confirm your account or save this change. Please try again.'
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }


  return (
    <main className="place-details" data-place-details={place.id}>
      <nav className="place-breadcrumbs" aria-label="Breadcrumb">
        <a href="#explore">Explore Naga</a>
        <span aria-hidden="true">/</span>
        <span>{place.category}</span>
        <span aria-hidden="true">/</span>
        <strong aria-current="page">{place.name}</strong>
      </nav>


      <span className="place-tag">{place.category}</span>


      <div className="place-title-row">
        <h1>{place.name}</h1>


        <button
          type="button"
          className="place-button"
          disabled={checkingSession || saving}
          aria-pressed={saved}
          onClick={toggleSaved}
        >
          <Bookmark filled={saved} />
          {checkingSession ? 'Checking account...' : saving ? 'Saving...' : saved ? 'Saved' : 'Save place'}
        </button>
      </div>


      <p className="place-location">
        <Pin />
        {place.area ? place.area + ', ' : ''}
        Naga City, Camarines Sur
      </p>


      {message && (
        <p className="place-notice" role="status">
          {message}
        </p>
      )}


      {saveError && (
        <p className="place-error" role="alert">
          {saveError}
        </p>
      )}


      <div className="place-detail-grid">
        <section aria-labelledby="place-description-title">
          <AttractionGallery photos={photos} name={place.name} />


          {photo && place.photoCredit && (
            <p className="place-photo-credit">
              Photo: {place.photoCredit}
            </p>
          )}


          <h2 id="place-description-title">
            {place.heading || 'Discover ' + place.name}
          </h2>


          {paragraphs.map((paragraph, index) => (
            <p className="place-paragraph" key={index}>
              {paragraph}
            </p>
          ))}
        </section>


        <aside>
          <section className="place-panel place-panel-soft">
            <h2>At a glance</h2>


            <div className="place-fact">
              <Bookmark />
              <div>
                <b>Experience</b>
                <p>{place.experience || place.category}</p>
              </div>
            </div>


            <div className="place-fact">
              <Pin />
              <div>
                <b>Find it in</b>
                <p>{place.location || place.area || 'Naga City'}</p>
              </div>
            </div>


            <dl className="place-visit-facts">
              <div>
                <dt>Estimated entrance fee</dt>
                <dd>{formatFee(place.cost)}</dd>
              </div>


              <div>
                <dt>Estimated visit duration</dt>
                <dd>
                  {place.duration
                    ? place.duration + ' minutes'
                    : 'Confirm before visiting'}
                </dd>
              </div>
            </dl>
          </section>


          <section className="place-panel">
            <h3 className="place-accent-heading">Before you go</h3>


            <p>
              {place.advice ||
                place.openingHours ||
                'Check current visitor information before your visit.'}
            </p>


            <p className="place-small">
              Fees and durations are estimates. Confirm access,
              opening hours, and service schedules directly with
              the attraction.
            </p>


            <a
              className="place-button"
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Find on map
              <span aria-hidden="true">&#8599;</span>
            </a>
          </section>
        </aside>
      </div>


      <section className="place-next-banner">
        <div>
          <h3>Where to next?</h3>
          <p>Keep exploring Naga’s places of faith and city spaces.</p>
        </div>


        <a className="place-button" href="#explore">
          <span aria-hidden="true">&#8592;</span>
          Back to Explore Naga
        </a>
      </section>
    </main>
  );
}


function Pin() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
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


function Bookmark({ filled = false }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4Z" />
    </svg>
  );
}
