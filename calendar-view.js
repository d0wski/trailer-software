// calendar-view.js - Calendar with booking management

import { getActiveTrailers, getBookings, getBookingsInRange, addBooking, updateBooking, deleteBooking, getTrailer, isTrailerAvailable, TRAILER_CATEGORIES } from '../store.js';

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function getCategoryName(categoryId) {
  const cat = TRAILER_CATEGORIES.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

export function loadCalendarView() {
  const main = document.querySelector('.main');
  
  main.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h1 style="margin: 0;">Calendar</h1>
        <button class="btn btn-primary" id="addBookingBtn">+ New Booking</button>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <button class="btn btn-secondary" id="prevMonth">&larr; Prev</button>
        <h2 id="monthYear" style="margin: 0;"></h2>
        <button class="btn btn-secondary" id="nextMonth">Next &rarr;</button>
      </div>

      <div id="calendarGrid" style="margin-bottom: 24px;">
        <!-- Calendar renders here -->
      </div>

      <div id="bookingsList">
        <!-- Bookings list renders here -->
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  document.getElementById('addBookingBtn').addEventListener('click', () => {
    openBookingModal();
  });

  renderCalendar();
}

function renderCalendar() {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  document.getElementById('monthYear').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Get bookings for this month
  const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonth}`;
  const bookings = getBookingsInRange(monthStart, monthEnd);
  const trailers = getActiveTrailers();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let calendarHTML = `
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 8px; overflow: hidden;">
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Sun</div>
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Mon</div>
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Tue</div>
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Wed</div>
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Thu</div>
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Fri</div>
      <div style="background: #f9fafb; padding: 10px; text-align: center; font-weight: 700; font-size: 13px;">Sat</div>
  `;

  // Empty cells for days before first day of month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarHTML += `<div style="background: #f9fafb; padding: 8px; min-height: 80px;"></div>`;
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayBookings = bookings.filter(b => b.startDate <= dateStr && b.endDate >= dateStr);
    const isToday = dateStr === todayStr;
    
    calendarHTML += `
      <div style="background: #fff; padding: 8px; min-height: 80px; cursor: pointer; ${isToday ? 'outline: 2px solid var(--brand); outline-offset: -2px;' : ''}" 
           onclick="window.handleDayClick('${dateStr}')">
        <div style="font-weight: ${isToday ? '700' : '600'}; font-size: 14px; margin-bottom: 4px; ${isToday ? 'color: var(--brand);' : ''}">${day}</div>
        ${dayBookings.slice(0, 3).map(b => {
          const trailer = trailers.find(t => t.id === b.trailerId);
          const isStart = b.startDate === dateStr;
          const isEnd = b.endDate === dateStr;
          return `
            <div style="font-size: 11px; padding: 2px 4px; margin-bottom: 2px; background: #dbeafe; color: #1e40af; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;"
                 onclick="event.stopPropagation(); window.handleBookingClick(${b.id})"
                 title="${b.customerName} - ${trailer ? trailer.name : 'Unknown'}">
              ${isStart ? '→ ' : ''}${b.customerName}${isEnd ? ' ←' : ''}
            </div>
          `;
        }).join('')}
        ${dayBookings.length > 3 ? `<div style="font-size: 10px; color: var(--muted);">+${dayBookings.length - 3} more</div>` : ''}
      </div>
    `;
  }

  // Empty cells to complete the grid
  const totalCells = startDayOfWeek + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remainingCells; i++) {
    calendarHTML += `<div style="background: #f9fafb; padding: 8px; min-height: 80px;"></div>`;
  }

  calendarHTML += '</div>';
  document.getElementById('calendarGrid').innerHTML = calendarHTML;

  // Render bookings list for current month
  renderBookingsList(bookings, trailers);
}

function renderBookingsList(bookings, trailers) {
  const sortedBookings = [...bookings].sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  document.getElementById('bookingsList').innerHTML = `
    <div class="panel">
      <h2>Bookings This Month (${bookings.length})</h2>
      ${sortedBookings.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Trailer</th>
              <th>Dates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sortedBookings.map(b => {
              const trailer = trailers.find(t => t.id === b.trailerId);
              return `
                <tr>
                  <td><strong>${b.customerName}</strong></td>
                  <td>${b.customerPhone || '-'}</td>
                  <td>${trailer ? trailer.name : 'Unknown'}</td>
                  <td>${formatDateRange(b.startDate, b.endDate)}</td>
                  <td>
                    <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="window.handleBookingClick(${b.id})">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;" onclick="window.handleDeleteBooking(${b.id})">Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : `
        <p style="color: var(--muted); padding: 20px 0; text-align: center;">No bookings this month</p>
      `}
    </div>
  `;
}

// Global handlers for calendar interactions
window.handleDayClick = function(dateStr) {
  openBookingModal(null, dateStr);
};

window.handleBookingClick = function(bookingId) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (booking) {
    openBookingModal(booking);
  }
};

window.handleDeleteBooking = function(bookingId) {
  if (confirm('Are you sure you want to delete this booking?')) {
    deleteBooking(bookingId);
    renderCalendar();
  }
};

function openBookingModal(booking = null, defaultDate = null) {
  const trailers = getActiveTrailers();
  const isEdit = booking !== null;
  const today = new Date().toISOString().split('T')[0];
  
  const modalContent = `
    <h2>${isEdit ? 'Edit Booking' : 'New Booking'}</h2>
    <form id="bookingForm">
      <div class="form-group">
        <label for="trailerId">Trailer *</label>
        <select id="trailerId" required>
          <option value="">Select a trailer...</option>
          ${trailers.map(t => `
            <option value="${t.id}" ${booking && booking.trailerId === t.id ? 'selected' : ''}>
              ${t.name} (${getCategoryName(t.category)})
            </option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="customerName">Customer Name *</label>
        <input type="text" id="customerName" required value="${booking ? booking.customerName : ''}" placeholder="John Doe">
      </div>
      <div class="form-group">
        <label for="customerPhone">Phone</label>
        <input type="tel" id="customerPhone" value="${booking ? (booking.customerPhone || '') : ''}" placeholder="555-123-4567">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="form-group">
          <label for="startDate">Start Date *</label>
          <input type="date" id="startDate" required value="${booking ? booking.startDate : (defaultDate || today)}">
        </div>
        <div class="form-group">
          <label for="endDate">End Date *</label>
          <input type="date" id="endDate" required value="${booking ? booking.endDate : (defaultDate || today)}">
        </div>
      </div>
      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" rows="3" placeholder="Any additional notes...">${booking ? (booking.notes || '') : ''}</textarea>
      </div>
      <div id="availabilityWarning" style="display: none; padding: 10px; background: #fef9c3; border-radius: 8px; margin-bottom: 16px; color: #854d0e; font-size: 14px;">
        ⚠️ This trailer is not available for the selected dates
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Booking'}</button>
      </div>
    </form>
  `;

  openModal(modalContent);

  // Set up form validation
  const form = document.getElementById('bookingForm');
  const trailerSelect = document.getElementById('trailerId');
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const warningDiv = document.getElementById('availabilityWarning');

  function checkAvailability() {
    const trailerId = parseInt(trailerSelect.value);
    const start = startInput.value;
    const end = endInput.value;
    
    if (trailerId && start && end) {
      const available = isTrailerAvailable(trailerId, start, end, booking ? booking.id : null);
      warningDiv.style.display = available ? 'none' : 'block';
      return available;
    }
    warningDiv.style.display = 'none';
    return true;
  }

  trailerSelect.addEventListener('change', checkAvailability);
  startInput.addEventListener('change', () => {
    if (endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
    checkAvailability();
  });
  endInput.addEventListener('change', checkAvailability);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!checkAvailability()) {
      alert('This trailer is not available for the selected dates. Please choose different dates or a different trailer.');
      return;
    }

    const bookingData = {
      trailerId: parseInt(trailerSelect.value),
      customerName: document.getElementById('customerName').value.trim(),
      customerPhone: document.getElementById('customerPhone').value.trim(),
      startDate: startInput.value,
      endDate: endInput.value,
      notes: document.getElementById('notes').value.trim()
    };

    if (isEdit) {
      updateBooking(booking.id, bookingData);
    } else {
      addBooking(bookingData);
    }

    closeModal();
    renderCalendar();
  });
}

function formatDateRange(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const options = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}
