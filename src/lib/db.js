import { supabase } from './supabase';
import { resizeImage } from './imageResize';

// --- Image Upload (auto-resizes before uploading) ---
export async function uploadImage(file, folder = 'avatars') {
  // Resize: avatars smaller, products/stories medium
  const maxSize = folder === 'avatars' ? 400 : 800;
  const resized = await resizeImage(file, { maxWidth: maxSize, maxHeight: maxSize, quality: 0.8 });

  const ext = resized.name.split('.').pop() || 'webp';
  const contentType = resized.type || 'image/webp';
  const name = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('images').upload(name, resized, {
    contentType,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('images').getPublicUrl(name);
  return data.publicUrl;
}

// --- Customers ---
export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name');
  if (error) throw error;
  return data;
}

export async function reorderCustomers(orderedIds) {
  const updates = orderedIds.map((id, i) =>
    supabase.from('customers').update({ sort_order: i }).eq('id', id)
  );
  await Promise.all(updates);
}

export async function getCustomer(id) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCustomer(name, avatar_url = null, phone = null) {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, avatar_url, phone })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id, updates) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// --- Products ---
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createProduct({ name, price, category, subcategory, image_url, published }) {
  const { data, error } = await supabase
    .from('products')
    .insert({ name, price, category, subcategory: subcategory || null, image_url: image_url || null, published: !!published })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// --- Transactions ---
export async function getTransactions(customerId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, products(name, image_url)')
    .eq('customer_id', customerId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction({ customer_id, type, amount, note, date, product_id }) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ customer_id, type, amount, note, date, product_id })
    .select('*, products(name, image_url)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// --- Published Products (for shop) ---
export async function getPublishedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('published', true)
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

// --- Stories ---
export async function getStories() {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Filter out stories older than 24h unless pinned
  const now = Date.now();
  return data.filter(s => s.pinned || (now - new Date(s.created_at).getTime()) < 86400000);
}

export async function createStory(image_url, caption = null) {
  const { data, error } = await supabase
    .from('stories')
    .insert({ image_url, caption })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStory(id) {
  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleStoryPin(id, pinned) {
  const { error } = await supabase.from('stories').update({ pinned }).eq('id', id);
  if (error) throw error;
}

// --- List all uploaded images ---
export async function listUploadedImages() {
  const folders = ['products', 'stories', 'gallery', 'avatars'];
  const allImages = [];

  for (const folder of folders) {
    const { data, error } = await supabase.storage.from('images').list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error || !data) continue;
    for (const file of data) {
      if (!file.name || file.name.startsWith('.')) continue;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(`${folder}/${file.name}`);
      allImages.push({
        name: file.name,
        folder,
        url: urlData.publicUrl,
        created_at: file.created_at,
      });
    }
  }

  // Sort newest first
  allImages.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return allImages;
}

// --- Delete uploaded image from storage ---
export async function deleteUploadedImage(folder, name) {
  const { error } = await supabase.storage.from('images').remove([`${folder}/${name}`]);
  if (error) throw error;
}

// --- Gallery ---
export async function getGallery() {
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGalleryItem(image_url, caption = null) {
  const { data, error } = await supabase
    .from('gallery')
    .insert({ image_url, caption })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGalleryItem(id) {
  const { error } = await supabase.from('gallery').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderGallery(orderedIds) {
  const updates = orderedIds.map((id, i) =>
    supabase.from('gallery').update({ sort_order: i }).eq('id', id)
  );
  await Promise.all(updates);
}

// --- Push Subscriptions ---
export async function savePushSubscription(subscription) {
  const { endpoint, keys } = subscription.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, keys_p256dh: keys.p256dh, keys_auth: keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
}

export async function getPushSubscriptions() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (error) throw error;
  return data;
}

// --- All Transactions (for history) ---
export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, customers(name, avatar_url), products(name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- Balance ---
export function calcBalance(transactions) {
  return transactions.reduce((sum, t) => {
    return t.type === 'charge' ? sum + Number(t.amount) : sum - Number(t.amount);
  }, 0);
}

export async function getCustomerBalance(customerId) {
  const txns = await getTransactions(customerId);
  return calcBalance(txns);
}

export async function getAllBalances() {
  const { data, error } = await supabase
    .from('transactions')
    .select('customer_id, type, amount');
  if (error) throw error;

  const balances = {};
  for (const t of data) {
    if (!balances[t.customer_id]) balances[t.customer_id] = 0;
    balances[t.customer_id] += t.type === 'charge' ? Number(t.amount) : -Number(t.amount);
  }
  return balances;
}
