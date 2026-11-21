import './AttractionStoryCard.css';
import { attractionPhoto } from '../media/imageUrls.js';

export default function AttractionStoryCard({ place }) {
  const photo = attractionPhoto(place.imageUrl);
  return <a className={'story-card' + (!photo ? ' story-card-no-photo' : '')}
    href={'#place/' + encodeURIComponent(place.id)} data-place-card={place.id}
    aria-label={'View ' + place.name}>
    {photo && <img className="story-card-photo" src={photo} alt={place.name} loading="lazy" />}
    <div className="story-card-caption">
      <span className="story-card-kicker">{place.category || 'Discover Naga'} &middot; {place.area || 'Naga City'}</span>
      <h3>{place.name}</h3>
      <p>{place.description || 'Discover a new stop for your next visit to Naga.'}</p>
      <span className="story-card-read">View <span aria-hidden="true">&#8599;</span></span>
    </div>
  </a>;
}
