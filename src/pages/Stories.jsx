import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import AdminNav from '../components/AdminNav';
import ImagePicker from '../components/ImagePicker';
import { getStories, createStory, deleteStory, toggleStoryPin, getGallery, createGalleryItem, deleteGalleryItem, reorderGallery, uploadImage } from '../lib/db';
import { supabase } from '../lib/supabase';

export default function Stories() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteGallery, setConfirmDeleteGallery] = useState(null);
  const [mediaTab, setMediaTab] = useState('stories');
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [st, gal] = await Promise.all([getStories(), getGallery()]);
      setStories(st);
      setGallery(gal);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleStorySelect(url) {
    try {
      await createStory(url);
      setShowStoryPicker(false);
      await loadAll();
      try {
        await supabase.functions.invoke('send-push', {
          body: { title: "Sarah's Nails", body: 'Nuevo contenido disponible!' },
        });
      } catch (e) { console.error('Push failed:', e); }
    } catch (err) { console.error(err); }
  }

  async function handleGallerySelect(url) {
    try {
      await createGalleryItem(url);
      setShowGalleryPicker(false);
      await loadAll();
    } catch (err) { console.error(err); }
  }

  async function handleDeleteStory(id) {
    try {
      await deleteStory(id);
      setConfirmDelete(null);
      await loadAll();
    } catch (err) { console.error(err); }
  }

  async function handleDeleteGallery(id) {
    try {
      await deleteGalleryItem(id);
      setConfirmDeleteGallery(null);
      await loadAll();
    } catch (err) { console.error(err); }
  }

  async function handleTogglePin(id, pinned) {
    try {
      await toggleStoryPin(id, !pinned);
      await loadAll();
    } catch (err) { console.error(err); }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Media</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Tabs */}
      <div className="catalog-tabs" style={{ marginBottom: 16 }}>
        <button className={`catalog-tab ${mediaTab === 'stories' ? 'active' : ''}`} onClick={() => setMediaTab('stories')}>
          Stories ({stories.length})
        </button>
        <button className={`catalog-tab ${mediaTab === 'gallery' ? 'active' : ''}`} onClick={() => setMediaTab('gallery')}>
          Galería ({gallery.length})
        </button>
      </div>

      {/* Stories section */}
      {mediaTab === 'stories' && <div className="media-section">
        <div className="media-section-header">
          <p className="stories-hint" style={{ flex: 1, margin: 0 }}>Círculos en la tienda. Fijadas no expiran, las demás 24h.</p>
          <button className="btn-add-sm" onClick={() => setShowStoryPicker(true)}>+</button>
        </div>

        {loading ? (
          <div className="loading" />
        ) : stories.length === 0 ? (
          <div className="empty-sm">No hay stories</div>
        ) : (
          <div className="stories-grid">
            {stories.map((s) => (
              <div key={s.id} className={`story-card ${s.pinned ? 'pinned' : ''}`}>
                <img src={s.image_url} alt="" className="story-card-img" />
                <div className="story-card-overlay">
                  <button
                    className={`story-card-pin ${s.pinned ? 'active' : ''}`}
                    onClick={() => handleTogglePin(s.id, s.pinned)}
                  >
                    {s.pinned ? 'Fijada' : 'Fijar'}
                  </button>
                  {confirmDelete === s.id ? (
                    <div className="story-card-confirm">
                      <button className="btn-danger-sm" onClick={() => handleDeleteStory(s.id)}>{t('confirm')}</button>
                      <button className="btn-secondary-sm" onClick={() => setConfirmDelete(null)}>{t('cancel')}</button>
                    </div>
                  ) : (
                    <button className="story-card-delete" onClick={() => setConfirmDelete(s.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Gallery section */}
      {mediaTab === 'gallery' && <div className="media-section">
        <div className="media-section-header">
          <p className="stories-hint" style={{ flex: 1, margin: 0 }}>Fotos de tu trabajo en "Nuestro Trabajo" en la tienda.</p>
          <button className="btn-add-sm" onClick={() => setShowGalleryPicker(true)}>+</button>
        </div>

        {gallery.length === 0 ? (
          <div className="empty-sm">No hay fotos</div>
        ) : (
          <>
            <p className="stories-hint" style={{ marginTop: 0 }}>Mantén presionado y arrastra para reordenar</p>
            <div className="stories-grid">
              {gallery.map((g, i) => (
                <div
                  key={g.id}
                  className={`story-card ${dragIdx === i ? 'dragging' : ''} ${overIdx === i && dragIdx !== i ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                  onDrop={async () => {
                    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
                    const newList = [...gallery];
                    const [moved] = newList.splice(dragIdx, 1);
                    newList.splice(i, 0, moved);
                    setGallery(newList);
                    setDragIdx(null);
                    setOverIdx(null);
                    await reorderGallery(newList.map(g => g.id));
                  }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                >
                  <div className="story-card-number">{i + 1}</div>
                  <img src={g.image_url} alt="" className="story-card-img" />
                  <div className="story-card-overlay">
                    {confirmDeleteGallery === g.id ? (
                      <div className="story-card-confirm">
                        <button className="btn-danger-sm" onClick={() => handleDeleteGallery(g.id)}>{t('confirm')}</button>
                        <button className="btn-secondary-sm" onClick={() => setConfirmDeleteGallery(null)}>{t('cancel')}</button>
                      </div>
                    ) : (
                      <button className="story-card-delete" onClick={() => setConfirmDeleteGallery(g.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>}

      {showStoryPicker && (
        <ImagePicker
          currentUrl={null}
          folder="stories"
          onSelect={handleStorySelect}
          onClose={() => setShowStoryPicker(false)}
          inline
          multiple
        />
      )}

      {showGalleryPicker && (
        <ImagePicker
          currentUrl={null}
          folder="gallery"
          onSelect={handleGallerySelect}
          onClose={() => setShowGalleryPicker(false)}
          inline
          multiple
        />
      )}

      <AdminNav />
    </div>
  );
}
