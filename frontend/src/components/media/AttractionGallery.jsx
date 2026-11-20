import { useRef, useState } from 'react';

export default function AttractionGallery({ photos = [], name = 'Attraction' }) {
  const track = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos.length) return null;

  function goTo(index) {
    const nextIndex = Math.max(0, Math.min(index, photos.length - 1));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.current?.scrollTo({
      left: nextIndex * track.current.clientWidth,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
    setActiveIndex(nextIndex);
  }

  function updateActive(event) {
    const element = event.currentTarget;
    if (!element.clientWidth) return;
    setActiveIndex(Math.round(element.scrollLeft / element.clientWidth));
  }

  return (
    <div className="place-gallery" role="region" aria-label={`${name} photo gallery`}>
      <div className="place-gallery-track" ref={track} onScroll={updateActive}>
        {photos.map((photo, index) => (
          <div className="place-gallery-slide" key={`${photo}-${index}`}>
            <img
              src={photo}
              alt={`${name}${index ? `, photo ${index + 1}` : ''}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              draggable="false"
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            className="place-gallery-arrow place-gallery-previous"
            type="button"
            aria-label="Previous photo"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <button
            className="place-gallery-arrow place-gallery-next"
            type="button"
            aria-label="Next photo"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === photos.length - 1}
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
          <div className="place-gallery-pagination" aria-label="Choose a photo">
            {photos.map((photo, index) => (
              <button
                key={`${photo}-dot-${index}`}
                type="button"
                aria-label={`Show photo ${index + 1} of ${photos.length}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
          <span className="place-gallery-count" aria-live="polite" aria-atomic="true">
            {activeIndex + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}
