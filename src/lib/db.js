import { supabase } from './supabase';

// --- Image Upload ---
export async function uploadImage(file, folder = 'avatars') {
  const ext = file.name.split('.').pop();
  const name = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('images').upload(name, file);
  if (error) throw error;
  const { data } = supabase.storage.from('images').getPublicUrl(name);
  return data.publicUrl;
}

// --- Customers ---
export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
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

export async function createProduct({ name, price, category, image_url = null }) {
  const { data, error } = await supabase
    .from('products')
    .insert({ name, price, category, image_url })
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
