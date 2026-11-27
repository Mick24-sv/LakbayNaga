import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import './navigationTransitions.css';

function readyForSnapshot() {
  return new Promise(resolve => {
    const done = () => { observer.disconnect(); clearTimeout(timeout); resolve(); };
    const check = () => { if (!document.querySelector('[data-navigation-loading="true"]')) done(); };
    const observer = new MutationObserver(check);
    const timeout = setTimeout(done, 1600);
    observer.observe(document.querySelector('.site-page-content'), { subtree: true, childList: true, attributes: true, attributeFilter: ['data-navigation-loading'] });
    check();
  });
}
const cardFor = id => [...document.querySelectorAll('[data-place-card]')].find(element => element.dataset.placeCard === id);
const photoIn = element => element?.querySelector('img') || null;
function visible(element) {
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight ? element : null;
}
function placeId(route) { try { return route.startsWith('place/') ? decodeURIComponent(route.slice(6)) : null; } catch { return null; } }
function clearSharedNames() { document.querySelectorAll('[data-shared-transition]').forEach(element => { element.style.viewTransitionName = ''; element.removeAttribute('data-shared-transition'); }); }
function share(element) { if (element) { element.style.viewTransitionName = 'attraction-card'; element.dataset.sharedTransition = 'true'; } }

export function useNavigationTransitions(readPage, setPage, clearError) {
  useEffect(() => {
    let route = readPage();
    let sequence = 0;
    let currentTransition;
    let fallbackAnimation;
    function animatePage() {
      fallbackAnimation?.cancel();
      fallbackAnimation = document.querySelector('.site-page-content')?.animate([
        { opacity: 0, transform: 'translateY(18px) scale(.965)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 550, easing: 'cubic-bezier(.2, .75, .25, 1)' });
    }
    const scrollPositions = new Map();
    async function navigate() {
      const next = readPage();
      if (next === route) return;
      const previous = route;
      route = next;
      const version = ++sequence;
      currentTransition?.skipTransition();
      fallbackAnimation?.cancel();
      scrollPositions.set(previous, window.scrollY);
      clearSharedNames();
      const forwardId = placeId(next);
      const backId = placeId(previous);
      const returning = !!backId && ['home', 'explore'].includes(next);
      const fromCard = forwardId && visible(photoIn(cardFor(forwardId)));
      const fromDetails = returning && visible(document.querySelector('[data-place-details] .place-gallery-slide img'));
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animate = !!document.startViewTransition && !reduced;
      if (animate) share(fromCard || fromDetails);
      const update = async () => {
        if (version !== sequence) return;
        flushSync(() => { setPage(next); clearError(''); });
        window.scrollTo({ top: scrollPositions.get(next) || 0, behavior: 'instant' });
        if (animate) await readyForSnapshot();
        if (version !== sequence) return;
        window.scrollTo({ top: scrollPositions.get(next) || 0, behavior: 'instant' });
        if (animate) {
          const destination = fromCard ? document.querySelector('[data-place-details] .place-gallery-slide img') : fromDetails ? photoIn(cardFor(backId)) : null;
          if (destination) {
            if (fromDetails) destination.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            share(destination);
          }
        }
      };
      if (!animate) {
        await update();
        if (!reduced && version === sequence) animatePage();
        return;
      }
      document.documentElement.dataset.navigationDirection = returning ? 'back' : 'forward';
      const transition = document.startViewTransition(update);
      currentTransition = transition;
      // A skipped snapshot must never prevent navigation or create an unhandled rejection.
      transition.ready.catch(() => {
        if (version === sequence && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) animatePage();
      });
      try { await transition.finished; }
      catch { /* The route remains usable if the browser skips an animation. */ }
      finally {
        if (version === sequence) {
          clearSharedNames();
          delete document.documentElement.dataset.navigationDirection;
          currentTransition = null;
        }
      }
    }
    window.addEventListener('hashchange', navigate);
    return () => { sequence++; fallbackAnimation?.cancel(); currentTransition?.skipTransition(); clearSharedNames(); delete document.documentElement.dataset.navigationDirection; window.removeEventListener('hashchange', navigate); };
  }, [readPage, setPage, clearError]);
}
