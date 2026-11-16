import { useEffect, useState } from 'react';
import ImageCropper from '../../components/media/ImageCropper.jsx';

const slots = [
  { key: 'logoImage', title: 'Logo', description: 'Used across your website.', aspect: 1.8 },
  { key: 'homepageBanner', title: 'Homepage banner', description: 'Shown at the top of the homepage.', aspect: 1.7 },
  { key: 'loginImage', title: 'Login & registration image', description: 'Appears beside the login and registration forms.', aspect: 1.25 },
];
const storageKey = 'lakbaynaga-site-images';
function readImages() {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
  catch { return {}; }
}
function writeImages(images) {
  localStorage.setItem(storageKey, JSON.stringify(images));
  window.dispatchEvent(new Event('site-images-updated'));
}

export default function SiteImages({ onMessage, onError }) {
  const [settings, setSettings] = useState(readImages);
  const [busy, setBusy] = useState(false);
  const [crop, setCrop] = useState(null);
  const [files, setFiles] = useState({});
  useEffect(() => {
    const sync = () => setSettings(readImages());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  async function upload(slot, file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onError('Choose a JPEG, PNG, or WebP image under 5 MB.');
      return;
    }
    setFiles(current => ({ ...current, [slot.key]: file }));
    setCrop(slot);
  }

  async function saveCrop(file) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/images', { method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image upload failed.');
      const next = { ...settings, [crop.key]: data.url };
      writeImages(next);
      setSettings(next);
      onMessage('Website image saved.'); onError(''); setCrop(null);
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function remove(slot) {
    if (!settings[slot.key] || busy) return;
    setBusy(true);
    try {
      const next = { ...settings, [slot.key]: '' };
      writeImages(next);
      setSettings(next);
      onMessage('Website image removed.'); onError('');
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  return <>
    <section className="panel site-image-settings">
      <header className="admin-panel-heading"><h2>Brand &amp; photography</h2><p>Upload or adjust a picture. Image changes are saved and applied automatically.</p></header>
      <div className="site-image-grid">{slots.map(slot => <article className="image-upload" key={slot.key}>
        <h3>{slot.title}</h3>
        <p className="upload-description">{slot.description}</p>
        {settings[slot.key] ? <img className="cover-preview" src={settings[slot.key]} alt={`${slot.title} preview`} /> : <div className="upload-empty">No image selected</div>}
        <label>Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => upload(slot, e.target.files?.[0])} /></label>
        <p className="upload-recommendation">Recommended: {slot.aspect > 1.6 ? 'wide landscape' : 'portrait'} image. JPEG, PNG, or WebP, up to 5 MB.</p>
        {settings[slot.key] && <button type="button" className="text-button image-remove-action" disabled={busy} onClick={() => remove(slot)}>Remove image</button>}
      </article>)}</div>
      <footer className="admin-panel-heading site-image-footer"><span>Image changes are applied to the website automatically.</span><a href="#home">View website</a></footer>
    </section>
    {crop && <ImageCropper file={files[crop.key]} aspect={crop.aspect} onCancel={() => setCrop(null)} onCrop={saveCrop} />}
  </>;
}
