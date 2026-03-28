import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { getProducts, createProduct, updateProduct, deleteProduct, uploadImage } from '../lib/db';
import { useCurrency } from '../lib/currency';
import { ICONS } from '../lib/icons';

export default function Catalog() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', category: 'service', icon: '💅', image_url: null });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAdd(category) {
    const defaultIcon = category === 'service' ? '💅' : '👟';
    setForm({ name: '', price: '', category, icon: defaultIcon, image_url: null });
    setEditItem(null);
    setImageFile(null);
    setImagePreview(null);
    setShowAdd(true);
  }

  function openEdit(item) {
    setForm({ name: item.name, price: String(item.price), category: item.category, icon: item.icon || '', image_url: item.image_url });
    setEditItem(item);
    setImageFile(null);
    setImagePreview(item.image_url);
    setShowAdd(true);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm((f) => ({ ...f, icon: '' }));
  }

  function selectIcon(emoji) {
    setForm((f) => ({ ...f, icon: emoji, image_url: null }));
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.price || Number(form.price) <= 0 || saving) return;
    setSaving(true);
    try {
      let image_url = form.image_url;
      if (imageFile) {
        image_url = await uploadImage(imageFile, 'products');
      }
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        icon: imageFile ? null : form.icon,
        image_url: imageFile ? image_url : (form.icon ? null : image_url),
      };
      if (editItem) {
        await updateProduct(editItem.id, payload);
      } else {
        await createProduct(payload);
      }
      setShowAdd(false);
      setEditItem(null);
      setImageFile(null);
      setImagePreview(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteProduct(id);
      setConfirmDelete(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
    }
  }

  const services = products.filter((p) => p.category === 'service');
  const productItems = products.filter((p) => p.category === 'product');
  const iconSet = form.category === 'service' ? ICONS.services : ICONS.products;

  return (
    <div className="page">
      <header className="header">
        <h1>{t('catalog')}</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="catalog-section services">
        <div className="catalog-section-header">
          <div className="catalog-section-icon">💅</div>
          <h3>{t('services')}</h3>
          <button className="btn-add-sm" onClick={() => openAdd('service')}>+</button>
        </div>
        {services.length === 0 ? (
          <div className="empty-sm">{t('no_results')}</div>
        ) : (
          <div className="catalog-list">
            {services.map((item) => (
              <div key={item.id} className="catalog-item service">
                <div className="catalog-item-info" onClick={() => openEdit(item)}>
                  <div className="catalog-item-visual service">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="catalog-item-img" />
                    ) : (
                      <span className="catalog-item-icon">{item.icon || '💅'}</span>
                    )}
                  </div>
                  <span className="catalog-item-name">{item.name}</span>
                  <span className="catalog-item-price">{fmt(item.price)}</span>
                </div>
                {confirmDelete === item.id ? (
                  <div className="catalog-item-actions">
                    <button className="btn-danger-sm" onClick={() => handleDelete(item.id)}>{t('confirm')}</button>
                    <button className="btn-secondary-sm" onClick={() => setConfirmDelete(null)}>{t('cancel')}</button>
                  </div>
                ) : (
                  <button className="btn-delete-sm" onClick={() => setConfirmDelete(item.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="catalog-section products">
        <div className="catalog-section-header">
          <div className="catalog-section-icon">🛍️</div>
          <h3>{t('products')}</h3>
          <button className="btn-add-sm" onClick={() => openAdd('product')}>+</button>
        </div>
        {productItems.length === 0 ? (
          <div className="empty-sm">{t('no_results')}</div>
        ) : (
          <div className="catalog-list">
            {productItems.map((item) => (
              <div key={item.id} className="catalog-item product">
                <div className="catalog-item-info" onClick={() => openEdit(item)}>
                  <div className="catalog-item-visual product">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="catalog-item-img" />
                    ) : (
                      <span className="catalog-item-icon">{item.icon || '👟'}</span>
                    )}
                  </div>
                  <span className="catalog-item-name">{item.name}</span>
                  <span className="catalog-item-price">{fmt(item.price)}</span>
                </div>
                {confirmDelete === item.id ? (
                  <div className="catalog-item-actions">
                    <button className="btn-danger-sm" onClick={() => handleDelete(item.id)}>{t('confirm')}</button>
                    <button className="btn-secondary-sm" onClick={() => setConfirmDelete(null)}>{t('cancel')}</button>
                  </div>
                ) : (
                  <button className="btn-delete-sm" onClick={() => setConfirmDelete(item.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setEditItem(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editItem ? t('edit') : (form.category === 'service' ? t('add_service') : t('add_product'))}</h2>
            <form onSubmit={handleSave}>
              {/* Icon picker */}
              <div className="icon-picker-section">
                <div className="icon-picker-grid">
                  {iconSet.map((ic) => (
                    <button
                      key={ic.emoji}
                      type="button"
                      className={`icon-picker-btn ${form.icon === ic.emoji && !imagePreview ? 'active' : ''}`}
                      onClick={() => selectIcon(ic.emoji)}
                    >
                      {ic.emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`icon-picker-btn upload ${imagePreview ? 'active' : ''}`}
                    onClick={() => fileRef.current?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="icon-picker-preview" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    )}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
              </div>

              <input
                type="text"
                placeholder={form.category === 'service' ? t('service_name') : t('product_name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={t('price')}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => navigate('/')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>{t('home_title')}</span>
        </button>
        <button className="nav-btn active" onClick={() => navigate('/catalog')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>{t('catalog')}</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/history')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          <span>{t('history_tab')}</span>
        </button>
      </nav>
    </div>
  );
}
