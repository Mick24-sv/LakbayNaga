import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SavedItinerarySuccessDialog.css';

export default function SavedItinerarySuccessDialog({ name, updated = false, onStay, onView }) {
  const dialog = useRef(null);
  const stayButton = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    stayButton.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function closeOnEscape(event) {
    event.preventDefault();
    onStay();
  }

  return createPortal(
    <dialog ref={dialog} className="saved-success-dialog" aria-labelledby={titleId}
      aria-describedby={descriptionId} onCancel={closeOnEscape}>
      <div className="saved-success-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 4 4L19 6" />
        </svg>
      </div>
      <h2 id={titleId}>{updated ? 'Itinerary updated' : 'Itinerary saved'}</h2>
      <p id={descriptionId}>{updated ? 'Your changes to this itinerary were saved.' : 'Your itinerary was successfully saved.'}</p>
      {name && <p className="saved-success-name">{name}</p>}
      <p className="saved-success-prompt">Would you like to proceed to your saved trips?</p>
      <div className="saved-success-actions">
        <button ref={stayButton} type="button" className="saved-success-stay" onClick={onStay}>
          No
        </button>
        <button type="button" className="saved-success-view" onClick={onView}>
          Proceed
        </button>
      </div>
    </dialog>,
    document.body
  );
}
