import { useEffect, useState } from 'react';

export default function ImageCropper({ file, aspect, onCancel, onCrop }) {
  const [src, setSrc] = useState('');
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function crop() {
    const image = new Image();
    image.onload = () => {
      const sourceAspect = image.width / image.height;
      let width = image.width;
      let height = image.height;
      if (sourceAspect > aspect) width = height * aspect;
      else height = width / aspect;
      width /= zoom;
      height /= zoom;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvas.getContext('2d').drawImage(image, (image.width - width) / 2, (image.height - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob && onCrop(new File([blob], file.name.replace(/\.[^.]+$/, '') + '-cropped.jpg', { type: 'image/jpeg' })), 'image/jpeg', .9);
    };
    image.src = src;
  }

  return <div className="image-crop-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
    <section className="image-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <h2 id="crop-title">Adjust image crop</h2>
      <p>Preview the image and adjust the zoom before saving.</p>
      <div className="image-crop-window" style={{ aspectRatio: aspect }}><img src={src} alt="Crop preview" style={{ transform: `scale(${zoom})` }} /></div>
      <label>Zoom <input type="range" min="1" max="3" step=".05" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
      <div className="image-crop-actions"><button type="button" className="outline" onClick={onCancel}>Cancel</button><button type="button" className="auth-submit" onClick={crop}>Use crop</button></div>
    </section>
  </div>;
}
