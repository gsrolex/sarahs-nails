import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getPublishedProducts, getRecentlySoldProducts, getStories, getGallery, savePushSubscription } from '../lib/db';
import './Shop.css';

const WHATSAPP_NUMBER = '50558213009';
const VAPID_PUBLIC_KEY = 'BItE7C-Iq-Y9v5tZj_ZHB4eqtyU67b9fvBUQwJFvucUrLrT8y0ZtvxKQdcFqvFhVt6Kx5nxY8it2_nnU7VAEmM8';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [soldProducts, setSoldProducts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [tab, setTab] = useState('services');
  const [activeFilter, setActiveFilter] = useState(null);
  const [shopSearch, setShopSearch] = useState('');
  const [expandedService, setExpandedService] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [zoomImages, setZoomImages] = useState(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const [gallery, setGallery] = useState([]);
  const [notifAsked, setNotifAsked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [prods, sold, st, gal] = await Promise.all([getPublishedProducts(), getRecentlySoldProducts(), getStories(), getGallery()]);
        setProducts(prods);
        setSoldProducts(sold);
        setStories(st);
        setGallery(gal);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Ask for notification permission after first interaction
  async function askNotificationPermission() {
    if (notifAsked || typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') {
      await subscribeToPush();
      return;
    }
    if (Notification.permission === 'denied') return;
    setNotifAsked(true);
    const perm = await Notification.requestPermission();
    if (perm === 'granted') await subscribeToPush();
  }

  async function subscribeToPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await savePushSubscription(sub);
    } catch (err) {
      console.error('Push subscribe failed:', err);
    }
  }

  // Auto-ask on first visit (after a short delay)
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    try {
      if (Notification.permission === 'granted') {
        subscribeToPush();
      } else if (Notification.permission === 'default') {
        const timer = setTimeout(() => askNotificationPermission(), 5000);
        return () => clearTimeout(timer);
      }
    } catch (e) { console.error('Notification check failed:', e); }
  }, []);

  // Story viewer
  useEffect(() => {
    if (activeStory === null) return;
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((p) => {
        if (p >= 100) {
          if (activeStory < stories.length - 1) {
            setActiveStory(activeStory + 1);
            return 0;
          } else {
            setActiveStory(null);
            return 0;
          }
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [activeStory, stories.length]);

  function handleStoryTap(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      if (activeStory > 0) setActiveStory(activeStory - 1);
    } else {
      if (activeStory < stories.length - 1) setActiveStory(activeStory + 1);
      else setActiveStory(null);
    }
  }

  async function shareProduct(product) {
    const price = Number(product.price);
    const priceText = price > 0 ? ` - C$${price.toFixed(2)}` : '';
    const text = `${product.name}${priceText}\n\nMíralo en Sarah's Nails:`;
    const url = 'https://sarahsnailsni.com';

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url });
      } catch (e) { /* user cancelled */ }
    } else {
      navigator.clipboard?.writeText(`${text} ${url}`);
    }
  }

  function orderOnWhatsApp(product) {
    const price = Number(product.price);
    const priceText = price > 0 ? ` - C$${price.toFixed(2)}` : '';
    const msg = encodeURIComponent(`Hola! Me interesa: ${product.name}${priceText}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  }

  const services = products.filter(p => p.category === 'service');
  const productItems = products.filter(p => p.category === 'product');

  const subcategories = useMemo(() => {
    const cats = new Set();
    productItems.forEach(p => { if (p.subcategory) cats.add(p.subcategory); });
    return [...cats].sort();
  }, [productItems]);

  const filteredProducts = productItems
    .filter(p => !activeFilter || p.subcategory === activeFilter)
    .filter(p => !shopSearch || p.name.toLowerCase().includes(shopSearch.toLowerCase()));

  const filteredSold = soldProducts
    .filter(p => !activeFilter || p.subcategory === activeFilter)
    .filter(p => !shopSearch || p.name.toLowerCase().includes(shopSearch.toLowerCase()));

  const visibleStories = stories.slice(0, 6);

  return (
    <div className="shop-page">
      {/* Story viewer overlay */}
      {activeStory !== null && stories[activeStory] && (
        <div className="story-viewer" onClick={handleStoryTap}>
          <div className="story-progress-bar">
            {stories.map((_, i) => (
              <div key={i} className="story-progress-track">
                <div
                  className="story-progress-fill"
                  style={{
                    width: i < activeStory ? '100%' : i === activeStory ? `${storyProgress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>
          <button className="story-close" onClick={(e) => { e.stopPropagation(); setActiveStory(null); }}>✕</button>
          <img src={stories[activeStory].image_url} alt="" className="story-viewer-img" />
          {stories[activeStory].caption && (
            <div className="story-caption">{stories[activeStory].caption}</div>
          )}
        </div>
      )}

      {/* Compact header */}
      <header className="shop-header">
        <div className="shop-header-row">
          <img src="/logo.png" alt="Sarah's Nails" className="shop-logo" />
          <div className="shop-header-icons">
            <a href="https://www.instagram.com/sarahsnails2308" target="_blank" rel="noopener noreferrer" className="shop-icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="shop-icon-btn whatsapp">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Stories */}
      {visibleStories.length > 0 && (
        <div className="shop-stories">
          {visibleStories.map((s, i) => (
            <button key={s.id} className="shop-story-bubble" onClick={() => setActiveStory(i)}>
              <img src={s.image_url} alt="" />
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="shop-tabs">
        <button
          className={`shop-tab ${tab === 'services' ? 'active' : ''}`}
          onClick={() => setTab('services')}
        >
          Servicios
        </button>
        <button
          className={`shop-tab ${tab === 'products' ? 'active' : ''}`}
          onClick={() => { setTab('products'); setActiveFilter(null); }}
        >
          Productos
        </button>
      </div>

      {/* Category filters (products only) */}
      {/* Search bar — products tab */}
      {tab === 'products' && (
        <div className="shop-search">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={shopSearch}
            onChange={(e) => setShopSearch(e.target.value)}
          />
        </div>
      )}

      {tab === 'products' && subcategories.length > 0 && (
        <div className="shop-cat-filters">
          {subcategories.map((cat) => (
            <button
              key={cat}
              className={`shop-cat-btn ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
            >
              {cat} ({productItems.filter(p => p.subcategory === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="shop-loading" />
      ) : tab === 'services' ? (
        /* Services — expandable cards */
        <div className="shop-section">
          {services.length === 0 ? (
            <div className="shop-empty">No hay servicios</div>
          ) : (
            <div className="shop-services-list">
              {services.map((s) => {
                const isOpen = expandedService === s.id;
                const allImages = [
                  ...(s.image_url ? [{ url: s.image_url }] : []),
                  ...(s.product_images || []).map(pi => ({ url: pi.image_url })),
                ];
                const idx = carouselIndex[s.id] || 0;
                return (
                  <div key={s.id} className={`shop-service-card ${isOpen ? 'open' : ''}`}>
                    <button className="shop-service-header" onClick={() => setExpandedService(isOpen ? null : s.id)}>
                      {s.image_url && <img src={s.image_url} alt="" className="shop-service-thumb" />}
                      <div className="shop-service-info">
                        <h3>{s.name}</h3>
                        {Number(s.price) > 0 && <span className="shop-service-price">C${Number(s.price).toFixed(2)}</span>}
                      </div>
                      <span className={`shop-service-arrow ${isOpen ? 'open' : ''}`}>›</span>
                    </button>

                    {isOpen && (
                      <div className="shop-service-body">
                        {/* Image carousel */}
                        {allImages.length > 0 && (
                          <div className="shop-carousel"
                            onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; }}
                            onTouchEnd={(e) => {
                              const dx = e.changedTouches[0].clientX - swipeStartX.current;
                              if (Math.abs(dx) < 50) return;
                              if (dx < 0) setCarouselIndex(prev => ({ ...prev, [s.id]: (idx + 1) % allImages.length }));
                              else setCarouselIndex(prev => ({ ...prev, [s.id]: (idx - 1 + allImages.length) % allImages.length }));
                            }}
                          >
                            <img src={allImages[idx]?.url} alt="" className="shop-carousel-img" />
                            {allImages.length > 1 && (
                              <>
                                <button className="shop-carousel-prev" onClick={() => setCarouselIndex(prev => ({ ...prev, [s.id]: (idx - 1 + allImages.length) % allImages.length }))}>‹</button>
                                <button className="shop-carousel-next" onClick={() => setCarouselIndex(prev => ({ ...prev, [s.id]: (idx + 1) % allImages.length }))}>›</button>
                                <div className="shop-carousel-dots">
                                  {allImages.map((_, i) => (
                                    <span key={i} className={`shop-carousel-dot ${i === idx ? 'active' : ''}`} />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {s.description && <p className="shop-service-desc">{s.description}</p>}

                        <div className="shop-service-actions">
                        <button className="shop-service-order-btn" onClick={() => orderOnWhatsApp(s)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Consultar
                        </button>
                        <button className="shop-service-share-btn" onClick={() => shareProduct(s)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Products — grid */
        <div className="shop-section">
          {filteredProducts.length === 0 ? (
            <div className="shop-empty">No hay productos</div>
          ) : (
            <div className="shop-grid">
              {filteredProducts.map((p) => (
                <div key={p.id} className="shop-card" onClick={() => setSelectedProduct(p)}>
                  {p.image_url && (
                    <div className="shop-card-img-wrap">
                      <img src={p.image_url} alt={p.name} className="shop-card-img" />
                    </div>
                  )}
                  <div className="shop-card-body">
                    <h3>{p.name}</h3>
                    {p.subcategory && <span className="shop-card-cat">{p.subcategory}</span>}
                    {Number(p.price) > 0 && <span className="shop-card-price">C${Number(p.price).toFixed(2)}</span>}
                  </div>
                </div>
              ))}

              {/* Sold products */}
              {filteredSold.map((p) => (
                <div key={p.id} className="shop-card sold" onClick={() => setSelectedProduct({ ...p, _sold: true })}>
                  {p.image_url && (
                    <div className="shop-card-img-wrap">
                      <img src={p.image_url} alt={p.name} className="shop-card-img" />
                      <div className="shop-sold-overlay">Vendido</div>
                    </div>
                  )}
                  <div className="shop-card-body">
                    <h3>{p.name}</h3>
                    {p.subcategory && <span className="shop-card-cat">{p.subcategory}</span>}
                    {Number(p.price) > 0 && <span className="shop-card-price">C${Number(p.price).toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gallery — show on services tab */}
      {tab === 'services' && gallery.length > 0 && (
        <div className="shop-section">
          <div className="shop-insta-header">
            <h2>Nuestro Trabajo</h2>
            <a href="https://www.instagram.com/sarahsnails2308" target="_blank" rel="noopener noreferrer" className="shop-insta-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @sarahsnails2308
            </a>
          </div>
          <div className="shop-insta-grid">
            {gallery.slice(0, 9).map((g) => (
              <div key={g.id} className="shop-insta-item" onClick={() => { setZoomImages(gallery.slice(0, 9).map(x => x.image_url)); setZoomIndex(gallery.slice(0, 9).indexOf(g)); }}>
                <img src={g.image_url} alt="" />
              </div>
            ))}
          </div>
          <a href="https://www.instagram.com/sarahsnails2308" target="_blank" rel="noopener noreferrer" className="shop-insta-follow">
            Ver más en Instagram
          </a>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="shop-product-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="shop-product-detail" onClick={(e) => e.stopPropagation()}>
            <button className="shop-product-close" onClick={() => setSelectedProduct(null)}>✕</button>
            <button className="shop-product-share" onClick={(e) => { e.stopPropagation(); shareProduct(selectedProduct); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            {selectedProduct.image_url && (
              <div className="shop-product-img-wrap" onClick={() => { setZoomImages([selectedProduct.image_url]); setZoomIndex(0); }}>
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="shop-product-img" />
                <span className="shop-product-zoom-hint">Toca para ampliar</span>
              </div>
            )}
            <div className="shop-product-info">
              <h2>{selectedProduct.name}</h2>
              {selectedProduct.subcategory && <span className="shop-product-cat">{selectedProduct.subcategory}</span>}
              {Number(selectedProduct.price) > 0 && <span className="shop-product-price">C${Number(selectedProduct.price).toFixed(2)}</span>}
            </div>
            {selectedProduct._sold ? (
              <button className="shop-service-order-btn sold" onClick={() => {
                const msg = encodeURIComponent(`Hola! Vi que "${selectedProduct.name}" ya se vendió. Tienen algo similar?`);
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                setSelectedProduct(null);
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Preguntar por algo similar
              </button>
            ) : (
            <button className="shop-service-order-btn" onClick={() => { orderOnWhatsApp(selectedProduct); setSelectedProduct(null); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Pedir por WhatsApp
            </button>
            )}
          </div>
        </div>
      )}

      {/* Zoom gallery overlay */}
      {zoomImages && (
        <div
          className="shop-zoom-overlay"
          onClick={() => setZoomImages(null)}
          onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; swipeStartY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - swipeStartX.current;
            const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY.current);
            if (dy > Math.abs(dx)) return; // vertical swipe, ignore
            if (Math.abs(dx) < 50) return; // too small
            e.stopPropagation();
            if (dx < 0) setZoomIndex((zoomIndex + 1) % zoomImages.length);
            else setZoomIndex((zoomIndex - 1 + zoomImages.length) % zoomImages.length);
          }}
        >
          <img src={zoomImages[zoomIndex]} alt="" className="shop-zoom-img" onClick={(e) => e.stopPropagation()} />
          {zoomImages.length > 1 && (
            <>
              <button className="shop-zoom-prev" onClick={(e) => { e.stopPropagation(); setZoomIndex((zoomIndex - 1 + zoomImages.length) % zoomImages.length); }}>‹</button>
              <button className="shop-zoom-next" onClick={(e) => { e.stopPropagation(); setZoomIndex((zoomIndex + 1) % zoomImages.length); }}>›</button>
              <div className="shop-zoom-counter">{zoomIndex + 1} / {zoomImages.length}</div>
            </>
          )}
          <button className="shop-zoom-close" onClick={() => setZoomImages(null)}>✕</button>
        </div>
      )}

      {/* Footer */}
      <footer className="shop-footer">
        <img src="/logo.png" alt="" className="shop-footer-logo" />
        <p>Nicaragua · +505 5821-3009</p>
        <div className="shop-footer-links">
          <a href="https://www.instagram.com/sarahsnails2308" target="_blank" rel="noopener noreferrer">Instagram</a>
          <span>·</span>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
        <a href="/admin" className="shop-admin-link">Admin</a>
      </footer>
    </div>
  );
}
