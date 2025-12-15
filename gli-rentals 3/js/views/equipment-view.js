// equipment-view.js - Equipment inventory management

import { getTrailers, getBookings, addTrailer, updateTrailer, deleteTrailer, getBookingsForTrailer } from '../store.js';

export async function loadEquipmentView() {
  const main = document.querySelector('.main');
  const today = new Date().toISOString().split('T')[0];

  // Fetch all data in parallel
  const [trailers, allBookings] = await Promise.all([
    getTrailers(),
    getBookings()
  ]);

  // Determine rental status locally
  const trailerStatuses = trailers.map(t => {
    const activeBooking = allBookings.find(b => 
      b.trailer_id === t.id && 
      b.start_date <= today && 
      b.end_date >= today
    );
    return { trailer: t, activeBooking };
  });

  main.innerHTML = `
    <div class="card">
      <div class="flex-between mb-3">
        <h1 class="mb-0">Equipment</h1>
        <button class="btn btn-primary" id="addTrailerBtn">+ Add Equipment</button>
      </div>

      <div id="equipmentList">
        ${trailers.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 40px;"></th>
                <th>Name</th>
                <th>Identifier</th>
                <th>Status</th>
                <th>Location</th>
                <th style="width: 40px;"></th>
              </tr>
            </thead>
            <tbody id="sortableBody">
              ${trailerStatuses.map(({ trailer: t, activeBooking }, index) => {
                const isRented = !!activeBooking;
                
                return `
                  <tr draggable="true" data-id="${t.id}" data-index="${index}" onclick="window.viewEquipmentDetail('${t.id}')" class="cursor-pointer">
                    <td class="drag-handle" onclick="event.stopPropagation()">⋮⋮</td>
                    <td><strong>${t.name}</strong></td>
                    <td>${t.identifier || '-'}</td>
                    <td>
                      <span class="pill ${isRented ? 'red' : 'green'}">
                        ${isRented ? 'Rented' : 'Available'}
                      </span>
                    </td>
                    <td class="text-muted" style="font-size: 13px;">${isRented ? activeBooking.customer_name : 'Shop'}</td>
                    <td class="text-muted">→</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">
            <p>No equipment added yet</p>
            <button class="btn btn-primary" onclick="document.getElementById('addTrailerBtn').click()">+ Add Your First Trailer</button>
          </div>
        `}
      </div>
    </div>
  `;

  document.getElementById('addTrailerBtn').addEventListener('click', () => {
    openEquipmentModal();
  });

  setupDragAndDrop();
}

function setupDragAndDrop() {
  const tbody = document.getElementById('sortableBody');
  if (!tbody) return;

  let draggedRow = null;

  tbody.addEventListener('dragstart', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    draggedRow = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  tbody.addEventListener('dragend', (e) => {
    const row = e.target.closest('tr');
    if (row) row.classList.remove('dragging');
    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    draggedRow = null;
  });

  tbody.addEventListener('dragover', (e) => {
    e.preventDefault();
    const row = e.target.closest('tr');
    if (!row || row === draggedRow) return;
    
    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });

  tbody.addEventListener('drop', (e) => {
    e.preventDefault();
    const dropRow = e.target.closest('tr');
    if (!dropRow || !draggedRow || dropRow === draggedRow) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const draggedIndex = rows.indexOf(draggedRow);
    const dropIndex = rows.indexOf(dropRow);

    if (draggedIndex < dropIndex) {
      dropRow.after(draggedRow);
    } else {
      dropRow.before(draggedRow);
    }

    saveNewOrder();
  });
}

function saveNewOrder() {
  const tbody = document.getElementById('sortableBody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const newOrder = rows.map(row => parseInt(row.dataset.id));

  const data = JSON.parse(localStorage.getItem('gli_rentals_data'));
  const reordered = newOrder.map(id => data.trailers.find(t => t.id === id));
  data.trailers = reordered;
  localStorage.setItem('gli_rentals_data', JSON.stringify(data));
}

window.viewEquipmentDetail = function(id) {
  loadEquipmentDetailView(id);
};

export async function loadEquipmentDetailView(id) {
  const main = document.querySelector('.main');
  const trailers = await getTrailers();
  const trailer = trailers.find(t => t.id === id);
  
  if (!trailer) {
    main.innerHTML = `<div class="card"><p>Equipment not found</p></div>`;
    return;
  }
  
  const bookings = await getBookingsForTrailer(id);
  const today = new Date().toISOString().split('T')[0];
  const activeBooking = bookings.find(b => b.start_date <= today && b.end_date >= today);
  const isRented = !!activeBooking;
  
  // Sort bookings by date descending (most recent first)
  const sortedBookings = [...bookings].sort((a, b) => b.start_date.localeCompare(a.start_date));
  
  // Calculate total revenue
  const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.price_quoted) || 0), 0);
  
  main.innerHTML = `
    <div class="card">
      <div class="mb-3">
        <a href="#" onclick="window.backToEquipment()" class="back-link">← Back to Equipment</a>
      </div>
      
      <div class="flex-between mb-3" style="align-items: flex-start;">
        <div>
          <h1 class="mb-1">${trailer.name}</h1>
          <p class="text-muted mb-0">
            ${trailer.identifier ? `ID: ${trailer.identifier}` : 'No identifier'}
            <span class="pill ${isRented ? 'red' : 'green'}" style="margin-left: 12px;">
              ${isRented ? 'Rented' : 'Available'}
            </span>
          </p>
        </div>
        <button class="btn btn-secondary" onclick="window.editEquipmentDetail('${trailer.id}')">Edit</button>
      </div>
      
      ${trailer.notes ? `
        <div class="panel mb-3">
          <strong class="text-muted" style="font-size: 13px;">Notes</strong>
          <p class="mb-0 mt-1">${trailer.notes}</p>
        </div>
      ` : ''}
      
      <div class="kpi-grid mb-3" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi">
          <div class="label">Total Bookings</div>
          <div class="value">${bookings.length}</div>
        </div>
        <div class="kpi">
          <div class="label">Total Revenue</div>
          <div class="value">$${totalRevenue.toLocaleString()}</div>
        </div>
        <div class="kpi">
          <div class="label">Current Status</div>
          <div class="value" style="font-size: 18px;">${isRented ? activeBooking.customer_name : 'At Shop'}</div>
        </div>
      </div>
      
      <div class="panel">
        <h2>Rental History</h2>
        ${sortedBookings.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Dates</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sortedBookings.map(b => {
                const isPast = b.end_date < today;
                const isCurrent = b.start_date <= today && b.end_date >= today;
                const isFuture = b.start_date > today;
                let status = 'Past';
                let statusClass = '';
                if (isCurrent) { status = 'Active'; statusClass = 'red'; }
                else if (isFuture) { status = 'Upcoming'; statusClass = 'blue'; }
                
                return `
                  <tr>
                    <td><strong>${b.customer_name}</strong></td>
                    <td>${formatDateRange(b.start_date, b.end_date)}</td>
                    <td>${b.price_quoted ? '$' + parseFloat(b.price_quoted).toLocaleString() : '-'}</td>
                    <td>${statusClass ? `<span class="pill ${statusClass}">${status}</span>` : status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `
          <p class="text-muted text-center" style="padding: 20px 0;">No rental history yet</p>
        `}
      </div>
      
      <div class="danger-zone">
        <h3>Danger Zone</h3>
        <p>
          Deleting this equipment will also delete all ${bookings.length} associated booking(s). This cannot be undone.
        </p>
        <button class="btn btn-danger" onclick="window.openDeleteConfirmModal('${trailer.id}', '${trailer.name}', ${bookings.length})">Delete Equipment</button>
      </div>
    </div>
  `;
}

window.backToEquipment = async function() {
  await loadEquipmentView();
};

window.editEquipmentDetail = async function(id) {
  const trailers = await getTrailers();
  const trailer = trailers.find(t => t.id === id);
  if (trailer) {
    openEquipmentModal(trailer, true);
  }
};

window.openDeleteConfirmModal = function(id, name, bookingCount) {
  const modalContent = `
    <h2 class="text-danger">Delete Equipment</h2>
    <p>You are about to permanently delete <strong>${name}</strong>.</p>
    ${bookingCount > 0 ? `<p class="text-danger"><strong>Warning:</strong> This will also delete ${bookingCount} booking(s).</p>` : ''}
    <p class="mt-2">Type <strong>delete</strong> to confirm:</p>
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
      await deleteTrailer(id);
      closeModal();
      await loadEquipmentView();
    }
  });
};

function formatDateRange(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  if (start === end) {
    return startDate.toLocaleDateString('en-US', options);
  }
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', options)}`;
}

function openEquipmentModal(trailer = null, returnToDetail = false) {
  const isEdit = trailer !== null;

  const modalContent = `
    <h2>${isEdit ? 'Edit Equipment' : 'Add Equipment'}</h2>
    <form id="equipmentForm">
      <div class="form-group">
        <label for="trailerName">Name *</label>
        <input type="text" id="trailerName" required value="${trailer ? trailer.name : ''}" placeholder="5x10 Trailer #1">
      </div>
      <div class="form-group">
        <label for="trailerIdentifier">Identifier</label>
        <input type="text" id="trailerIdentifier" value="${trailer ? (trailer.identifier || '') : ''}" placeholder="License plate, serial #, etc.">
      </div>
      <div class="form-group">
        <label for="trailerNotes">Notes</label>
        <textarea id="trailerNotes" rows="3" placeholder="Any additional notes...">${trailer ? (trailer.notes || '') : ''}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Equipment'}</button>
      </div>
    </form>
  `;

  openModal(modalContent);

  const form = document.getElementById('equipmentForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const trailerData = {
      name: document.getElementById('trailerName').value.trim(),
      category: 'default',
      identifier: document.getElementById('trailerIdentifier').value.trim(),
      notes: document.getElementById('trailerNotes').value.trim()
    };

    if (isEdit) {
      await updateTrailer(trailer.id, trailerData);
    } else {
      await addTrailer(trailerData);
    }

    closeModal();
    if (returnToDetail && isEdit) {
      await loadEquipmentDetailView(trailer.id);
    } else {
      await loadEquipmentView();
    }
  });
}