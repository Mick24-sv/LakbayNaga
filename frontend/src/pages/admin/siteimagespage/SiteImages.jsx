import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageUpload, uploadedImage } from '../../../components/media/WebsiteImages.jsx';
import { adminRequest } from '../adminLogic.js';
import HomeHero from '../../home/HomeHero.jsx';
import '../../home/HomePage.css';
import './SiteImages.css';

const empty = { logo: '', hero: '', account: '' };
const slots = [
  { key: 'logo', label: 'Logo', ratio: 1, recommendation: 'Recommended: 512 x 512 px (1:1 square). Use PNG or WebP with a transparent background.' },
  { key: 'hero', label: 'Homepage banner', ratio: 16 / 9, recommendation: 'Recommended: 1600 x 900 px (16:9 landscape). Keep the main subject toward the right, away from the banner text.' },
  { key: 'account', label: 'Login & registration image', ratio: 2 / 3, recommendation: 'Recommended: 1000 x 1500 px (2:3 portrait). Keep the subject centered; the image crops to fill the panel.', description: 'Appears beside the login and registration forms on desktop. Use a portrait or tall photo.' },
];

function BannerLayoutProbe({ onSize }) {
  const root = useRef(null);
  const [width, setWidth] = useState(() => document.documentElement.clientWidth);
  useEffect(() => {
    const resized = () => setWidth(document.documentElement.clientWidth);
    window.addEventListener('resize', resized);
    return () => window.removeEventListener('resize', resized);
  }, []);
  useEffect(() => {
    let active = true;
    const hero = root.current.querySelector('.home-hero');
    const measure = () => {
      const size = hero.getBoundingClientRect();
      if (active && size.width && size.height) onSize({ width: size.width, height: size.height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    document.fonts.ready.then(measure);
    measure();
    return () => { active = false; observer.disconnect(); };
  }, [width, onSize]);
  return createPortal(
    <div ref={root} className="home-page banner-layout-probe" aria-hidden="true" inert
      style={{ position: 'fixed', left: '-100000px', top: 0, width, visibility: 'hidden', pointerEvents: 'none' }}>
      <HomeHero idPrefix="banner-probe-" />
    </div>,
    document.body
  );
}

export default function SiteImages({ onMessage, onError }) {
  const [settings, setSettings] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const lock = useRef(false);
  const [bannerSize, setBannerSize] = useState(null);

  useEffect(() => {
    let active = true;
    adminRequest('/site-images').then(data => {
      if (!active) return;
      const next = { ...empty, ...data };
      // Older FE-07 selections were browser-only. Let the admin explicitly save them.
      if (!Object.values(next).some(Boolean)) {
        try {
          const old = JSON.parse(localStorage.getItem('lakbaynaga-site-images') || '{}');
          const previous = { logo: uploadedImage(old.logoImage), hero: uploadedImage(old.homepageBanner), account: uploadedImage(old.loginImage) };
          if (Object.values(previous).some(Boolean)) {
            setSettings(previous);
            onMessage?.('Earlier browser selections are ready. Save website images to publish them for all visitors.');
            return;
          }
        } catch { /* ignore unavailable browser cache */ }
      }
      setSettings(next);
    }).catch(error => {
      if (active) { setLoadFailed(true); onError?.(error.message); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function persist(values) {
    if (lock.current) throw new Error('Another image change is being saved. Please try again.');
    lock.current = true;
    setBusy(true);
    onError?.('');
    onMessage?.('');
    try {
      const data = await adminRequest('/admin/site-images', { method: 'PUT', body: values });
      setSettings({ ...empty, ...data });
      try { localStorage.removeItem('lakbaynaga-site-images'); } catch { /* optional legacy cache */ }
      window.dispatchEvent(new CustomEvent('site-images-updated', { detail: data }));
      onMessage?.('Website images saved and applied.');
      return data;
    } finally { lock.current = false; setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    try { await persist(settings); }
    catch (error) { onError?.(error.message); }
  }

  return (
    <form className="panel site-image-settings" onSubmit={save}>
      <BannerLayoutProbe onSize={setBannerSize} />
      <div className="admin-panel-heading">
        <h2>Brand &amp; photography</h2>
        <p>Upload or adjust a picture. Website image changes are saved and applied automatically.</p>
      </div>
      {loading && <p className="admin-list-state" role="status">Loading website images...</p>}
      <div className="site-image-grid">
        {slots.map(slot => (
          <ImageUpload key={slot.key} label={slot.label} cropRatio={slot.key === 'hero' && bannerSize ? bannerSize.width / bannerSize.height : slot.ratio}
            recommendation={slot.key === 'hero' && bannerSize ? 'Crop preview matches your homepage banner at this screen width (' + Math.round(bannerSize.width) + ' x ' + Math.round(bannerSize.height) + ' px). Other screen widths may show a different crop.' : slot.recommendation} description={slot.description}
            value={settings[slot.key]} onChange={value => persist({ [slot.key]: value })}
            disabled={busy || loading || loadFailed || (slot.key === 'hero' && !bannerSize)} />
        ))}
      </div>
      <div className="admin-form-footer">
        <p>Image changes are applied to the website automatically. <a href="#login">View login page</a></p>
        <button className="auth-submit" disabled={busy || loading || loadFailed}>
          {busy ? 'Saving...' : 'Save website images'}
        </button>
      </div>
    </form>
  );
}
