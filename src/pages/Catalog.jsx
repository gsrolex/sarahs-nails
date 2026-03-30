import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import ImagePicker from '../components/ImagePicker';
import { useI18n } from '../lib/i18n';
import { getProducts, createProduct, updateProduct, deleteProduct, uploadImage, getStories, createStory, deleteStory, toggleStoryPin } from '../lib/db';
import { useCurrency } from '../lib/currency';
const SUBCATEGORIES = ['Zapatos', 'Vestidos', 'Blusas', 'Pantalones', 'Faldas', 'Bolsas', 'Lentes', 'Sombreros', 'Perfumes', 'Accesorios', 'Ropa Interior', 'Otro'];

export default function Catalog() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', category: 'service', subcategory: '', image_url: null, published: false });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [catTab, setCatTab] = useState('product');
  const [catFilter, setCatFilter] = useState(null);
  const [catSearch, setCatSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const storyFileRef = useRef();
  const fileRef = useRef();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [prods, st] = await Promise.all([getProducts(), getStories()]);
      setProducts(prods);
      setStories(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data);
  }

  async function handleStoryUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'stories');
      await createStory(url);
      const st = await getStories();
      setStories(st);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteStory(id) {
    try {
      await deleteStory(id);
      const st = await getStories();
      setStories(st);
    } catch (err) { console.error(err); }
  }

  async function handleTogglePin(id, pinned) {
    try {
      await toggleStoryPin(id, !pinned);
      const st = await getStories();
      setStories(st);
    } catch (err) { console.error(err); }
  }

  function openAdd(category) {
    setForm({ name: '', price: '', category, subcategory: '', image_url: null, published: false });
    setEditItem(null);
    setImageFile(null);
    setImagePreview(null);
    setShowAdd(true);
  }

  function openEdit(item) {
    setForm({ name: item.name, price: item.price ? String(item.price) : '', category: item.category, subcategory: item.subcategory || '', image_url: item.image_url, published: !!item.published });
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
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      // imagePreview is the source of truth — it's either a URL (existing/uploaded) or null
      const payload = {
        name: form.name.trim(),
        price: form.price ? Number(form.price) : null,
        category: form.category,
        subcategory: form.subcategory || null,
        image_url: imagePreview || null,
        published: form.published,
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


  // Filtered list
  const subcategories = [...new Set(productItems.map(p => p.subcategory).filter(Boolean))].sort();
  const displayList = catTab === 'service' ? services : productItems;
  const filteredList = displayList
    .filter(item => !catFilter || item.subcategory === catFilter)
    .filter(item => !catSearch || item.name.toLowerCase().includes(catSearch.toLowerCase()));

  return (
    <div className="page">
      <header className="header">
        <h1>{t('catalog')}</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Add buttons */}
      <div className="catalog-add-row">
        <button className="catalog-add-btn" onClick={() => openAdd('product')}>
          + {t('add_product')}
        </button>
        <button className="catalog-add-btn secondary" onClick={() => openAdd('service')}>
          + {t('add_service')}
        </button>
      </div>

      {/* Tabs */}
      <div className="catalog-tabs">
        <button className={`catalog-tab ${catTab === 'product' ? 'active' : ''}`} onClick={() => { setCatTab('product'); setCatFilter(null); }}>
          {t('products')} ({productItems.length})
        </button>
        <button className={`catalog-tab ${catTab === 'service' ? 'active' : ''}`} onClick={() => { setCatTab('service'); setCatFilter(null); }}>
          {t('services')} ({services.length})
        </button>
      </div>

      {/* Category filter chips (products only) */}
      {catTab === 'product' && subcategories.length > 0 && (
        <div className="catalog-filter-chips">
          {subcategories.map((cat) => (
            <button
              key={cat}
              className={`catalog-chip ${catFilter === cat ? 'active' : ''}`}
              onClick={() => setCatFilter(catFilter === cat ? null : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <input type="text" placeholder={t('search')} value={catSearch} onChange={(e) => setCatSearch(e.target.value)} />
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="empty-sm">{t('no_results')}</div>
      ) : (
        <div className="catalog-list">
          {filteredList.map((item) => (
            <div key={item.id} className={`catalog-item ${item.category}`}>
              <div className="catalog-item-info" onClick={() => openEdit(item)}>
                <div className={`catalog-item-visual ${item.category}`}>
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="catalog-item-img" />
                  ) : (
                    <span className="catalog-item-placeholder">+</span>
                  )}
                </div>
                <div className="catalog-item-text">
                  <span className="catalog-item-name">{item.name}</span>
                  {item.subcategory && <span className="catalog-item-subcat">{item.subcategory}</span>}
                </div>
                {Number(item.price) > 0 && <span className="catalog-item-price">{fmt(item.price)}</span>}
              </div>
              <button
                className={`publish-toggle ${item.published ? 'on' : ''}`}
                onClick={(e) => { e.stopPropagation(); updateProduct(item.id, { published: !item.published }).then(loadProducts); }}
              >
                {item.published ? '👁' : '👁‍🗨'}
              </button>
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

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editItem ? t('edit') : (form.category === 'service' ? t('add_service') : t('add_product'))}</h2>
            <ImagePicker
              currentUrl={imagePreview}
              folder="products"
              onSelect={(url) => {
                setImagePreview(url);
                setImageFile(null);
                setForm((f) => ({ ...f, image_url: url }));
              }}
            />
            <form onSubmit={handleSave}>
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
                placeholder={`${t('price')} (${t('custom')})`}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              {form.category === 'product' && (
                <select
                  className="subcategory-select"
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                >
                  <option value="">— Categoría —</option>
                  {SUBCATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className={`publish-toggle-row ${form.published ? 'on' : ''}`}
                onClick={() => setForm({ ...form, published: !form.published })}
              >
                <span className="publish-toggle-eye">{form.published ? '👁' : '👁‍🗨'}</span>
                <span>{form.published ? 'Visible en tienda' : 'Oculto en tienda'}</span>
              </button>
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



      <AdminNav />
    </div>
  );
}
