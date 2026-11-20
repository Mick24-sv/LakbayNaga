import ConfirmDialog from '../../components/dialogs/ConfirmDialog.jsx';
import { useState } from 'react';
import ImageCropper from '../../components/media/ImageCropper.jsx';

export default function AttractionPhotos({ value, onChange, disabled, onError }) {
  const [crop, setCrop] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingSlot, setPendingSlot] = useState('cover');
  const gallery = value.galleryImages || [];

  function choose(file, slot) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onError('Choose a JPEG, PNG, or WebP image under 5 MB.');
      return;
    }
    setPendingSlot(slot);
    setCrop(file);
    onError('');
  }

  async function upload(file) {
    setUploading(true);
    try {
      const response = await fetch('/api/admin/images', { method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image upload failed.');
      if (pendingSlot === 'cover') onChange({ ...value, imageUrl: data.url });
      else onChange({ ...value, galleryImages: [...gallery, data.url] });
      setCrop(null);
    } catch (error) { onError(error.message); }
    finally { setUploading(false); }
  }

  function removeGallery(url) {
    onChange({ ...value, galleryImages: gallery.filter(image => image !== url) });
  }

  return <>
    <section className="panel attraction-photo-panel">
      <h3>Attraction photo</h3>
      {value.imageUrl ? <img className="attraction-cover-preview" src={value.imageUrl} alt="Attraction cover preview" /> : <div className="attraction-cover-empty">No image selected</div>}
      <label className="attraction-upload-label">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} onChange={event => { choose(event.target.files?.[0], 'cover'); event.target.value = ''; }} /></label>
      <p className="small">Recommended: 1200 × 800 px landscape. JPEG, PNG, or WebP, up to 5 MB.</p>
      {value.imageUrl && <div className="attraction-photo-actions"><button type="button" className="text-button image-crop-action" disabled={disabled || uploading} onClick={() => document.getElementById('replace-attraction-cover')?.click()}>Adjust crop</button><button type="button" className="text-button image-remove-action" disabled={disabled || uploading} onClick={() => setRemoveTarget({ slot: 'cover' })}>Remove image</button><input id="replace-attraction-cover" className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { choose(event.target.files?.[0], 'cover'); event.target.value = ''; }} /></div>}

      <div className="attraction-gallery-editor">
        <h3>Gallery photos</h3>
        <p className="small">Add up to 8 extra photos. Visitors can swipe through them on the attraction page.</p>
        {gallery.length > 0 && <div className="attraction-gallery-thumbs">{gallery.map(url => <div key={url}><img src={url} alt="Gallery photo preview" /><button type="button" disabled={disabled || uploading} onClick={() => setRemoveTarget({ slot: 'gallery', url })}>Remove</button></div>)}</div>}
        <div className="attraction-gallery-upload">
          <div className="attraction-gallery-empty">{gallery.length ? 'Add another photo' : 'No images selected'}</div>
          <label className="attraction-upload-label">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading || gallery.length >= 8} onChange={event => { choose(event.target.files?.[0], 'gallery'); event.target.value = ''; }} /></label>
          <p className="small">Recommended: 1200 × 800 px. JPEG, PNG, or WebP, up to 5 MB.</p>
        </div>
      </div>
      <label className="attraction-credit-label">Photo credit<input maxLength="300" value={value.photoCredit || ''} disabled={disabled} onChange={event => onChange({ ...value, photoCredit: event.target.value })} /></label>
    </section>
    {removeTarget && <ConfirmDialog title="Remove this photo?" description="The photo will be removed from this attraction when you save your changes." name={removeTarget.slot === 'cover' ? 'Attraction cover photo' : 'Gallery photo'} confirmLabel="Remove photo" busy={false} onCancel={()=>setRemoveTarget(null)} onConfirm={()=>{if(removeTarget.slot==='cover')onChange({...value,imageUrl:''});else removeGallery(removeTarget.url);setRemoveTarget(null);}} />}
    {crop && <ImageCropper file={crop} aspect={1.5} onCancel={() => setCrop(null)} onCrop={upload} />}
  </>;
}
