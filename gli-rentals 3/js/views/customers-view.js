// customers-view.js - Customer management

import { getCustomers, getCustomer, addCustomer, updateCustomer, deleteCustomer, getBookings, getTrailers } from '../store.js';

let currentFilter = 'all-time';
let currentSearch = '';

export async function loadCustomersView() {
  const main = document.querySelector('.main');
  
  main.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h1 style="margin: 0;">Customers</h1>
        <button class="btn btn-primary" id="addCustomerBtn">+ Add Customer</button>
      </div>
      
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <input type="text" id="customerSearch" placeholder="Search customers..." style="width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px;">
        </div>
        <select id="timeFilter" style="padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px; min-width: 150px;">
          <option value="all-time">All Time</option>
          <option value="5-years">Past 5 Years</option>
          <option value="1-year">Past Year</option>
          <option value="1-month">Past Month</option>
        </select>
        <select id="sortBy" style="padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px; min-width: 150px;">
          <option value="name">Sort by Name</option>
          <option value="spent">Sort by Amount Spent</option>
          <option value="days">Sort by Days Rented</option>
          <option value="bookings">Sort by # of Bookings</option>
        </select>
      </div>
      
      <div id="customersList">
        <p style="text-align: center; color: var(--muted); padding: 40px;">Loading customers...</p>
      </div>
    </div>
  `;
  
  document.getElementById('addCustomerBtn').addEventListener('click', () => {
    openCustomerModal();
  });
  
  document.getElementById('customerSearch').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderCustomersList();
  });
  
  document.getElementById('timeFilter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderCustomersList();
  });
  
  document.getElementById('sortBy').addEventListener('change', () => {
    renderCustomersList();
  });
  
  await renderCustomersList();
}

async function renderCustomersList() {
  const listDiv = document.getElementById('customersList');
  const sortBy = document.getElementById('sortBy').value;
  
  const customers = await getCustomers();
  const bookings = await getBookings();
  const trailers = await getTrailers();
  
  // Calculate date range based on filter
  const now = new Date();
  let filterDate = null;
  
  switch(currentFilter) {
    case '5-years':
      filterDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    case '1-year':
      filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case '1-month':
      filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    default:
      filterDate = null;
  }
  
  const filterDateStr = filterDate ? filterDate.toISOString().split('T')[0] : null;
  
  // Build customer stats
  const customerStats = customers.map(customer => {
    // Get bookings for this customer (by customer_id or by matching name for legacy bookings)
    let customerBookings = bookings.filter(b => 
      b.customer_id === customer.id || 
      (b.customer_name && b.customer_name.toLowerCase() === customer.name.toLowerCase())
    );
    
    // Apply time filter
    if (filterDateStr) {
      customerBookings = customerBookings.filter(b => b.start_date >= filterDateStr);
    }
    
    // Calculate total spent
    const totalSpent = customerBookings.reduce((sum, b) => sum + (parseFloat(b.price_quoted) || 0), 0);
    
    // Calculate total days rented
    const totalDays = customerBookings.reduce((sum, b) => {
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);
    
    return {
      ...customer,
      bookingCount: customerBookings.length,
      totalSpent,
      totalDays,
      bookings: customerBookings
    };
  });
  
  // Filter by search
  let filtered = customerStats;
  if (currentSearch) {
    const search = currentSearch.toLowerCase();
    filtered = customerStats.filter(c => 
      c.name.toLowerCase().includes(search) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search))
    );
  }
  
  // Sort
  switch(sortBy) {
    case 'spent':
      filtered.sort((a, b) => b.totalSpent - a.totalSpent);
      break;
    case 'days':
      filtered.sort((a, b) => b.totalDays - a.totalDays);
      break;
    case 'bookings':
      filtered.sort((a, b) => b.bookingCount - a.bookingCount);
      break;
    default:
      filtered.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  if (filtered.length === 0) {
    listDiv.innerHTML = `
      <div style="text-align: center; padding: 60px; color: var(--muted);">
        <p style="font-size: 16px; margin-bottom: 16px;">${currentSearch ? 'No customers found' : 'No customers yet'}</p>
        ${!currentSearch ? `<button class="btn btn-primary" onclick="document.getElementById('addCustomerBtn').click()">+ Add Your First Customer</button>` : ''}
      </div>
    `;
    return;
  }
  
  const timeLabel = {
    'all-time': 'All Time',
    '5-years': 'Past 5 Years',
    '1-year': 'Past Year',
    '1-month': 'Past Month'
  }[currentFilter];
  
  listDiv.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Bookings (${timeLabel})</th>
          <th>Days Rented</th>
          <th>Total Spent</th>
          <th style="width: 40px;"></th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(c => `
          <tr onclick="window.viewCustomerDetail('${c.id}')" style="cursor: pointer;">
            <td><strong>${c.name}</strong></td>
            <td style="color: var(--muted);">${c.phone || '-'}</td>
            <td>${c.bookingCount}</td>
            <td>${c.totalDays} days</td>
            <td><strong>$${c.totalSpent.toLocaleString()}</strong></td>
            <td style="color: var(--muted);">→</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 14px;">
      ${filtered.length} customer${filtered.length !== 1 ? 's' : ''} · 
      Total: $${filtered.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()} · 
      ${filtered.reduce((sum, c) => sum + c.totalDays, 0)} days rented
    </div>
  `;
}

window.viewCustomerDetail = async function(id) {
  const customer = await getCustomer(id);
  const bookings = await getBookings();
  const trailers = await getTrailers();
  
  // Get bookings for this customer
  const customerBookings = bookings.filter(b => 
    b.customer_id === id || 
    (b.customer_name && b.customer_name.toLowerCase() === customer.name.toLowerCase())
  ).sort((a, b) => b.start_date.localeCompare(a.start_date));
  
  const totalSpent = customerBookings.reduce((sum, b) => sum + (parseFloat(b.price_quoted) || 0), 0);
  const totalDays = customerBookings.reduce((sum, b) => {
    const start = new Date(b.start_date);
    const end = new Date(b.end_date);
    return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, 0);
  
  const main = document.querySelector('.main');
  
  main.innerHTML = `
    <div class="card">
      <div style="margin-bottom: 24px;">
        <a href="#" onclick="window.backToCustomers()" style="color: var(--muted); text-decoration: none; font-size: 14px;">← Back to Customers</a>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
        <div>
          <h1 style="margin: 0 0 8px;">${customer.name}</h1>
          <p style="color: var(--muted); margin: 0;">Customer since ${new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
        </div>
        <button class="btn btn-secondary" onclick="window.editCustomerFromDetail('${customer.id}')">Edit</button>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="kpi">
          <div class="label">Total Spent</div>
          <div class="value">$${totalSpent.toLocaleString()}</div>
        </div>
        <div class="kpi">
          <div class="label">Bookings</div>
          <div class="value">${customerBookings.length}</div>
        </div>
        <div class="kpi">
          <div class="label">Days Rented</div>
          <div class="value">${totalDays}</div>
        </div>
        <div class="kpi">
          <div class="label">Avg per Booking</div>
          <div class="value">$${customerBookings.length > 0 ? Math.round(totalSpent / customerBookings.length).toLocaleString() : 0}</div>
        </div>
      </div>
      
      <div class="panel" style="margin-bottom: 24px;">
        <h2>Contact Information</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin-bottom: 4px;">Phone</div>
            <div style="font-size: 16px;">${customer.phone || '—'}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin-bottom: 4px;">Email</div>
            <div style="font-size: 16px;">${customer.email || '—'}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin-bottom: 4px;">Address</div>
            <div style="font-size: 16px;">${customer.address || '—'}</div>
          </div>
        </div>
        ${customer.notes ? `
          <div style="margin-top: 16px; padding: 12px; background: #fef9c3; border-radius: 8px;">
            <div style="font-size: 12px; color: #854d0e; text-transform: uppercase; margin-bottom: 4px;">Notes</div>
            <div style="color: #854d0e;">${customer.notes}</div>
          </div>
        ` : ''}
      </div>
      
      <div class="panel">
        <h2>Rental History</h2>
        ${customerBookings.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Trailer</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Rental</th>
                <th>Ice</th>
                <th>Mileage</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${customerBookings.map(b => {
                const trailer = trailers.find(t => t.id === b.trailer_id);
                const start = new Date(b.start_date);
                const end = new Date(b.end_date);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                
                const rentalRate = parseFloat(b.rental_rate) || 0;
                const iceTotal = (parseInt(b.ice_bag_qty) || 0) * (parseFloat(b.ice_price_per_bag) || 0);
                const billableMiles = Math.max(0, (parseFloat(b.round_trip_miles) || 0) - 20);
                const mileageTotal = billableMiles * (parseFloat(b.price_per_mile) || 0);
                const total = parseFloat(b.price_quoted) || 0;
                
                return `
                  <tr>
                    <td><strong>${trailer ? trailer.name : 'Unknown'}</strong></td>
                    <td>${formatDateRange(b.start_date, b.end_date)}</td>
                    <td>${days}</td>
                    <td>$${rentalRate.toLocaleString()}</td>
                    <td>${b.ice_bag_qty ? `$${iceTotal.toLocaleString()} (${b.ice_bag_qty} × ${b.ice_bag_size})` : '—'}</td>
                    <td>${billableMiles > 0 ? `$${mileageTotal.toFixed(2)} (${billableMiles} mi)` : '—'}</td>
                    <td><strong>$${total.toLocaleString()}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `
          <p style="color: var(--muted); text-align: center; padding: 40px 0;">No rental history yet</p>
        `}
      </div>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--line);">
        <h3 style="color: #991b1b; margin-bottom: 12px;">Danger Zone</h3>
        <p style="color: var(--muted); font-size: 14px; margin-bottom: 12px;">
          Deleting this customer will remove their record. Their ${customerBookings.length} booking(s) will remain but won't be linked to this customer.
        </p>
        <button class="btn btn-danger" onclick="window.confirmDeleteCustomerFromDetail('${customer.id}', '${customer.name.replace(/'/g, "\\'")}', ${customerBookings.length})">Delete Customer</button>
      </div>
    </div>
  `;
};

window.backToCustomers = async function() {
  await loadCustomersView();
};

window.editCustomerFromDetail = async function(id) {
  const customer = await getCustomer(id);
  openCustomerModal(customer, true);
};

window.confirmDeleteCustomerFromDetail = function(id, name, bookingCount) {
  const modalContent = `
    <h2 style="color: #991b1b;">Delete Customer</h2>
    <p>You are about to delete <strong>${name}</strong>.</p>
    ${bookingCount > 0 ? `<p style="color: #991b1b; margin-top: 12px;"><strong>Warning:</strong> This customer has ${bookingCount} booking(s). The bookings will remain but will no longer be linked to this customer.</p>` : ''}
    <p style="margin-top: 16px;">Type <strong>delete</strong> to confirm:</p>
    <div class="form-group">
      <input type="text" id="deleteConfirmInput" placeholder="Type 'delete' here" autocomplete="off">
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-danger" id="confirmDeleteBtn" disabled>Delete</button>
    </div>
  `;
  
  openModal(modalContent);
  
  const input = document.getElementById('deleteConfirmInput');
  const btn = document.getElementById('confirmDeleteBtn');
  
  input.addEventListener('input', () => {
    btn.disabled = input.value.toLowerCase() !== 'delete';
  });
  
  btn.addEventListener('click', async () => {
    if (input.value.toLowerCase() === 'delete') {
      await deleteCustomer(id);
      closeModal();
      await loadCustomersView();
    }
  });
};

window.editCustomer = async function(id) {
  const customer = await getCustomer(id);
  openCustomerModal(customer);
};

window.confirmDeleteCustomer = function(id, name, bookingCount) {
  const warning = bookingCount > 0 
    ? `<p style="color: #991b1b; margin-bottom: 12px;"><strong>Warning:</strong> This customer has ${bookingCount} booking(s). The bookings will remain but will no longer be linked to this customer.</p>`
    : '';
  
  const modalContent = `
    <h2 style="color: #991b1b;">Delete Customer</h2>
    <p>You are about to delete <strong>${name}</strong>.</p>
    ${warning}
    <p style="margin-top: 16px;">Type <strong>delete</strong> to confirm:</p>
    <div class="form-group">
      <input type="text" id="deleteConfirmInput" placeholder="Type 'delete' here" autocomplete="off">
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-danger" id="confirmDeleteBtn" disabled>Delete</button>
    </div>
  `;
  
  openModal(modalContent);
  
  const input = document.getElementById('deleteConfirmInput');
  const btn = document.getElementById('confirmDeleteBtn');
  
  input.addEventListener('input', () => {
    btn.disabled = input.value.toLowerCase() !== 'delete';
  });
  
  btn.addEventListener('click', async () => {
    if (input.value.toLowerCase() === 'delete') {
      await deleteCustomer(id);
      closeModal();
      await loadCustomersView();
    }
  });
};

function openCustomerModal(customer = null, returnToDetail = false) {
  const isEdit = customer !== null;
  
  const modalContent = `
    <h2>${isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
    <form id="customerForm">
      <div class="form-group">
        <label for="customerName">Name *</label>
        <input type="text" id="customerName" required value="${customer ? customer.name : ''}" placeholder="John Doe">
      </div>
      <div class="form-group">
        <label for="customerPhone">Phone</label>
        <input type="tel" id="customerPhone" value="${customer ? (customer.phone || '') : ''}" placeholder="(555) 123-4567">
      </div>
      <div class="form-group">
        <label for="customerEmail">Email</label>
        <input type="email" id="customerEmail" value="${customer ? (customer.email || '') : ''}" placeholder="john@example.com">
      </div>
      <div class="form-group">
        <label for="customerAddress">Address</label>
        <input type="text" id="customerAddress" value="${customer ? (customer.address || '') : ''}" placeholder="123 Main St, City, MI">
      </div>
      <div class="form-group">
        <label for="customerNotes">Notes</label>
        <textarea id="customerNotes" rows="2" placeholder="Any notes about this customer...">${customer ? (customer.notes || '') : ''}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
      </div>
    </form>
  `;
  
  openModal(modalContent);
  
  document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerData = {
      name: document.getElementById('customerName').value.trim(),
      phone: document.getElementById('customerPhone').value.trim(),
      email: document.getElementById('customerEmail').value.trim(),
      address: document.getElementById('customerAddress').value.trim(),
      notes: document.getElementById('customerNotes').value.trim()
    };
    
    if (isEdit) {
      await updateCustomer(customer.id, customerData);
    } else {
      await addCustomer(customerData);
    }
    
    closeModal();
    if (returnToDetail && isEdit) {
      await window.viewCustomerDetail(customer.id);
    } else {
      await loadCustomersView();
    }
  });
}

function formatDateRange(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  if (start === end) {
    return startDate.toLocaleDateString('en-US', options);
  }
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', options)}`;
}