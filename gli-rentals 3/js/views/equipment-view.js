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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h1 style="margin: 0;">Equipment</h1>
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
                  <tr draggable="true" data-id="${t.id}" data-index="${index}" onclick="window.viewEquipmentDetail('${t.id}')" style="cursor: pointer;">
                    <td class="drag-handle" style="cursor: grab; color: var(--muted); font-size: 18px; text-align: center;" onclick="event.stopPropagation()">⋮⋮</td>
                    <td><strong>${t.name}</strong></td>
                    <td>${t.identifier || '-'}</td>
                    <td>
                      <span class="pill ${isRented ? 'red' : 'green'}">
                        ${isRented ? 'Rented' : 'Available'}
                      </span>
                    </td>
                    <td style="color: var(--muted); font-size: 13px;">${isRented ? activeBooking.customer_name : 'Shop'}</td>
                    <td style="color: var(--muted);">→</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `
          <div style="text-align: center; padding: 60px; color: var(--muted);">
            <p style="font-size: 16px; margin-bottom: 16px;">No equipment added yet</p>
            <button class="btn btn-primary" onclick="document.getElementById('addTrailerBtn').click()">+ Add Your First Trailer</button>
          </div>
        `}
      </div>
    </div>

    <style>
      #sortableBody tr.dragging {
        opacity: 0.4;
        background: #f1f5f9;
      }
      #sortableBody tr.drag-over {
        border-top: 2px solid var(--brand);
      }
      .drag-handle:active {
        cursor: grabbing;
      }
    </style>
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
      <div style="margin-bottom: 24px;">
        <a href="#" onclick="window.backToEquipment()" style="color: var(--muted); text-decoration: none; font-size: 14px;">← Back to Equipment</a>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
        <div>
          <h1 style="margin: 0 0 8px;">${trailer.name}</h1>
          <p style="color: var(--muted); margin: 0;">
            ${trailer.identifier ? `ID: ${trailer.identifier}` : 'No identifier'}
            <span class="pill ${isRented ? 'red' : 'green'}" style="margin-left: 12px;">
              ${isRented ? 'Rented' : 'Available'}
            </span>
          </p>
        </div>
        <button class="btn btn-secondary" onclick="window.editEquipmentDetail('${trailer.id}')">Edit</button>
      </div>
      
      ${trailer.notes ? `
        <div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
          <strong style="font-size: 13px; color: var(--muted);">Notes</strong>
          <p style="margin: 4px 0 0;">${trailer.notes}</p>
        </div>
      ` : ''}
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
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
          <p style="color: var(--muted); padding: 20px 0; text-align: center;">No rental history yet</p>
        `}
      </div>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--line);">
        <h3 style="color: #991b1b; margin-bottom: 12px;">Danger Zone</h3>
        <p style="color: var(--muted); font-size: 14px; margin-bottom: 12px;">
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
    <h2 style="color: #991b1b;">Delete Equipment</h2>
    <p>You are about to permanently delete <strong>${name}</strong>.</p>
    ${bookingCount > 0 ? `<p style="color: #991b1b;"><strong>Warning:</strong> This will also delete ${bookingCount} booking(s).</p>` : ''}
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