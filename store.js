// store.js - Supabase data management

import { supabase } from './supabase.js';

// Trailer categories
export const TRAILER_CATEGORIES = [
  { id: '5x10', name: '5x10', icon: 'assets/5x10ico.png' },
  { id: '75-slant', name: '75 Slant', icon: null },
  { id: 'model-100', name: 'Model 100', icon: null }
];




// Trailers
export async function getTrailers() {
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching trailers:', error);
    return [];
  }
  return data;
}

export async function getActiveTrailers() {
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching active trailers:', error);
    return [];
  }
  return data;
}


export async function getTrailer(id) {
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching trailer:', error);
    return null;
  }
  return data;
}

export async function addTrailer(trailer) {
  // Get max sort_order for new trailer
  const { data: existing } = await supabase
    .from('trailers')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  
  const maxOrder = existing && existing.length > 0 ? existing[0].sort_order : 0;
  
  const { data, error } = await supabase
    .from('trailers')
    .insert({
      name: trailer.name,
      category: trailer.category || 'default',
      identifier: trailer.identifier || null,
      notes: trailer.notes || null,
      active: true,
      sort_order: maxOrder + 1
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding trailer:', error);
    return null;
  }
  return data;
}

export async function updateTrailer(id, updates) {
  const { data, error } = await supabase
    .from('trailers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating trailer:', error);
    return null;
  }
  return data;
}

export async function deleteTrailer(id) {
  // Bookings are deleted automatically via ON DELETE CASCADE in the database
  const { error } = await supabase
    .from('trailers')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting trailer:', error);
    return false;
  }
  return true;
}

// Bookings
export async function getBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
  return data;
}

export async function getBooking(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
  return data;
}

export async function getBookingsForTrailer(trailerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('trailer_id', trailerId)
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching bookings for trailer:', error);
    return [];
  }
  return data;
}

export async function getBookingsInRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching bookings in range:', error);
    return [];
  }
  return data;
}

export async function addBooking(booking) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      trailer_id: booking.trailerId,
      customer_id: booking.customerId || null,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone || null,
      customer_email: booking.customerEmail || null,
      start_date: booking.startDate,
      end_date: booking.endDate,
      daily_rate: booking.dailyRate || null,
      notes: booking.notes || null,
      status: booking.status || 'confirmed',
      delivery_address: booking.deliveryAddress || null,
      price_quoted: booking.priceQuoted || null
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding booking:', error);
    return null;
  }
  return data;
}

export async function updateBooking(id, updates) {
  const dbUpdates = {};
  if (updates.trailerId !== undefined) dbUpdates.trailer_id = updates.trailerId;
  if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
  if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
  if (updates.customerEmail !== undefined) dbUpdates.customer_email = updates.customerEmail;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.dailyRate !== undefined) dbUpdates.daily_rate = updates.dailyRate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.deliveryAddress !== undefined) dbUpdates.delivery_address = updates.deliveryAddress;
  if (updates.priceQuoted !== undefined) dbUpdates.price_quoted = updates.priceQuoted;
  
  const { data, error } = await supabase
    .from('bookings')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating booking:', error);
    return null;
  }
  return data;
}

export async function deleteBooking(id) {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting booking:', error);
    return false;
  }
  return true;
}

// Check if trailer is available for a date range
export async function isTrailerAvailable(trailerId, startDate, endDate, excludeBookingId = null) {
  const bookings = await getBookingsForTrailer(trailerId);
  return !bookings.some(b => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    return b.start_date <= endDate && b.end_date >= startDate;
  });
}

// Get available trailers for a date range
export async function getAvailableTrailers(startDate, endDate) {
  const trailers = await getActiveTrailers();
  const available = [];
  for (const t of trailers) {
    const isAvailable = await isTrailerAvailable(t.id, startDate, endDate);
    if (isAvailable) {
      available.push(t);
    }
  }
  return available;
}

// Settings (TODO: implement with Supabase)
export async function getSettings() {
  return {};
}

export async function updateSettings(updates) {
  return {};
}


// Customers
export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data;
}

export async function getCustomer(id) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
  return data;
}

export async function addCustomer(customer) {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: customer.name,
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      notes: customer.notes || null
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding customer:', error);
    return null;
  }
  return data;
}

export async function updateCustomer(id, updates) {
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  dbUpdates.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('customers')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating customer:', error);
    return null;
  }
  return data;
}

export async function deleteCustomer(id) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting customer:', error);
    return false;
  }
  return true;
}

export async function getBookingsForCustomer(customerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('start_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching bookings for customer:', error);
    return [];
  }
  return data;
}

export async function searchCustomers(query) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(10);
  
  if (error) {
    console.error('Error searching customers:', error);
    return [];
  }
  return data;
}
