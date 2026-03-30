import { useState, useEffect, useRef } from 'react';
import { listUploadedImages, uploadImage, deleteUploadedImage } from '../lib/db';

export default function ImagePicker({ onSelect, onClose, currentUrl, folder = 'products', inline = false, multiple = false }) {
  const [showPicker, setShowPicker] = useState(inline);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef();
  const isUploadingRef = useRef(false);

  useEffect(() => {
    if (showPicker || inline) loadImages();
  }, [showPicker, inline]);

  async function loadImages() {
    setLoading(true);
    try {
      const imgs = await listUploadedImages();
      setImages(imgs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    isUploadingRef.current = true;
    setUploading(true);
    setUploadCount({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i], folder);
        onSelect(url);
        setUploadCount({ done: i + 1, total: files.length });
      }
      // Don't close — let the parent modal stay open
      // Just refresh the image list to show the new upload
      await loadImages();
    } catch (err) { console.error(err); }
    finally {
      isUploadingRef.current = false;
      setUploading(false);
      setUploadCount({ done: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDeleteImage(img) {
    try {
      await deleteUploadedImage(img.folder, img.name);
      setConfirmDelete(null);
      setImages((prev) => prev.filter((i) => i.url !== img.url));
    } catch (err) { console.error(err); }
  }

  function selectExisting(url) {
    onSelect(url);
    if (!multiple) closePicker();
  }

  function closePicker() {
    if (isUploadingRef.current) return;
    setShowPicker(false);
    setConfirmDelete(null);
    if (onClose) onClose();
  }

  function handleOverlayClick(e) {
    e.stopPropagation();
    if (e.target === e.currentTarget && !isUploadingRef.current) {
      closePicker();
    }
  }

  const progressText = uploadCount.total > 1
    ? `Subiendo ${uploadCount.done}/${uploadCount.total}...`
    : 'Subiendo...';

  const pickerModal = (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal image-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Elegir imagen{multiple ? 'es' : ''}</h2>

        <button
          className="image-picker-upload-btn"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          disabled={uploading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          {uploading ? progressText : (multiple ? 'Subir fotos' : 'Subir nueva foto')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleUpload}
          multiple={multiple}
          onClick={(e) => e.stopPropagation()}
        />

        {loading ? (
          <div className="loading" />
        ) : images.length === 0 ? (
          <div className="empty-sm">No hay imágenes</div>
        ) : (
          <>
            <p className="image-picker-label">O elegir una existente:</p>
            <div className="image-picker-grid">
              <button
                className="image-picker-item remove"
                onClick={() => { onSelect(null); if (!multiple) closePicker(); }}
              >
                <span className="image-picker-remove-x">✕</span>
              </button>
              {images.map((img) => (
                <div key={img.url} className="image-picker-item-wrap">
                  <button
                    className={`image-picker-item ${currentUrl === img.url ? 'selected' : ''}`}
                    onClick={() => selectExisting(img.url)}
                  >
                    <img src={img.url} alt="" loading="lazy" />
                  </button>
                  {confirmDelete === img.url ? (
                    <div className="image-picker-delete-confirm">
                      <button className="image-picker-confirm-yes" onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}>
                        Eliminar
                      </button>
                      <button className="image-picker-confirm-no" onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className="image-picker-delete-btn"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(img.url); }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <button className="image-picker-done-btn" onClick={closePicker}>
          Listo
        </button>
      </div>
    </div>
  );

  if (inline) return pickerModal;

  return (
    <>
      <div className="image-picker-trigger" onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}>
        {currentUrl ? (
          <img src={currentUrl} alt="" className="image-picker-preview" />
        ) : (
          <div className="image-picker-placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>Agregar foto</span>
          </div>
        )}
      </div>
      {showPicker && pickerModal}
    </>
  );
}
