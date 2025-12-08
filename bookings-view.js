// bookings-view.js - Booking management with availability checker and Gantt-style calendar

import { getActiveTrailers, getAvailableTrailers, getBookings, getBookingsInRange, addBooking, updateBooking, deleteBooking, isTrailerAvailable, getTrailers, getCustomers, addCustomer, searchCustomers } from '../store.js';

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Consistent colors for trailers
const TRAILER_COLORS = [
  '#3b82f6', // blue
  '#f97316', // orange
  '#22c55e', // green
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ef4444', // red
];

async function getTrailerColor(trailerId, trailers) {
  const index = trailers.findIndex(t => t.id === trailerId);
  return TRAILER_COLORS[index % TRAILER_COLORS.length];
}

export async function loadBookingsView() {
  const main = document.querySelector('.main');
  const today = new Date().toISOString().split('T')[0];

  main.innerHTML = `
    <div class="card" style="margin-bottom: 24px;">
      <div class="availability-header">
        <div class="availability-dates">
          <label>Pickup</label>
          <input type="date" id="startDate" value="${today}" min="${today}">
          <span class="date-arrow">→</span>
          <label>Return</label>
          <input type="date" id="endDate" value="${today}" min="${today}">
          <button class="btn btn-primary btn-sm" id="checkBtn">Check</button>
        </div>
        <div class="availability-summary" id="availabilitySummary"></div>
      </div>

      <div id="availabilityResults" class="availability-columns"></div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div class="calendar-nav">
          <button class="btn btn-secondary btn-sm" id="prevMonth">‹</button>
          <h2 id="monthYear" style="margin: 0; min-width: 160px; text-align: center;"></h2>
          <button class="btn btn-secondary btn-sm" id="nextMonth">›</button>
        </div>
        <button class="btn btn-primary" id="newBookingBtn">+ New Booking</button>
      </div>

      <div id="calendarGrid"></div>
    </div>

    <style>
      .availability-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .availability-dates {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .availability-dates label {
        font-size: 13px;
        font-weight: 600;
        color: var(--muted);
      }
      .availability-dates input[type="date"] {
        padding: 8px 10px;
        border: 1px solid var(--line);
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
      }
      .date-arrow {
        color: var(--muted);
        font-size: 16px;
      }
      .btn-sm {
        padding: 8px 14px;
        font-size: 13px;
      }
      .availability-summary {
        font-size: 14px;
        color: var(--muted);
      }
      .availability-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .avail-column {
        background: #fafbfc;
        border-radius: 10px;
        padding: 14px;
        min-height: 100px;
      }
      .avail-column.available {
        border: 1px solid #bbf7d0;
        background: linear-gradient(135deg, #f0fdf4 0%, #fafbfc 100%);
      }
      .avail-column.booked {
        border: 1px solid #fecaca;
        background: linear-gradient(135deg, #fef2f2 0%, #fafbfc 100%);
      }
      .avail-column-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        font-weight: 700;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .avail-column.available .avail-column-header { color: #166534; }
      .avail-column.booked .avail-column-header { color: #991b1b; }
      .avail-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .avail-column.available .avail-dot { background: #22c55e; }
      .avail-column.booked .avail-dot { background: #ef4444; }
      .avail-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .avail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: #fff;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all .15s ease;
        border: 1px solid transparent;
      }
      .avail-column.available .avail-item:hover {
        border-color: #22c55e;
        box-shadow: 0 2px 8px rgba(34,197,94,.15);
      }
      .avail-item-name { font-weight: 600; }
      .avail-item-action { font-size: 12px; color: #166534; font-weight: 600; }
      .avail-item-customer { font-size: 12px; color: #991b1b; }
      .avail-empty {
        color: var(--muted);
        font-size: 13px;
        padding: 12px 0;
        text-align: center;
      }

      .calendar-nav {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .gantt-calendar {
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
      }
      .gantt-header {
        display: grid;
        background: #f9fafb;
        border-bottom: 1px solid var(--line);
      }
      .gantt-header-day {
        padding: 10px 4px;
        text-align: center;
        font-size: 11px;
        border-right: 1px solid var(--line);
      }
      .gantt-header-day:last-child {
        border-right: none;
      }
      .gantt-header-weekday {
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
      }
      .gantt-header-date {
        font-weight: 600;
        font-size: 14px;
        margin-top: 2px;
      }
      .gantt-header-day.today .gantt-header-date {
        background: var(--brand);
        color: #fff;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        line-height: 24px;
        margin: 2px auto 0;
      }
      .gantt-header-day.other-month {
        opacity: 0.4;
      }
      .gantt-body {
        position: relative;
        min-height: 200px;
      }
      .gantt-grid {
        display: grid;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .gantt-grid-col {
        border-right: 1px solid var(--line);
      }
      .gantt-grid-col:last-child {
        border-right: none;
      }
      .gantt-grid-col.today {
        background: rgba(1,35,64,.03);
      }
      .gantt-grid-col.other-month {
        background: #f9fafb;
      }
      .gantt-rows {
        position: relative;
        z-index: 1;
        padding: 8px 0;
      }
      .gantt-row {
        height: 32px;
        position: relative;
        margin-bottom: 4px;
      }
      .gantt-bar {
        position: absolute;
        height: 26px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        box-shadow: 0 1px 3px rgba(0,0,0,.15);
        transition: transform .1s ease, box-shadow .1s ease;
        top: 3px;
      }
      .gantt-bar:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0,0,0,.2);
      }
      .gantt-bar-text {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gantt-empty {
        text-align: center;
        padding: 40px;
        color: var(--muted);
      }
      .gantt-click-area {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 0;
        display: grid;
      }
      .gantt-click-day {
        cursor: pointer;
      }
      .gantt-click-day:hover {
        background: rgba(1,35,64,.02);
      }

      @media (max-width: 600px) {
        .availability-columns {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;

  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const checkBtn = document.getElementById('checkBtn');

  startInput.addEventListener('change', () => {
    if (endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
    endInput.min = startInput.value;
    checkAvailability(startInput.value, endInput.value);
  });

  endInput.addEventListener('change', () => {
    checkAvailability(startInput.value, endInput.value);
  });

  checkBtn.addEventListener('click', () => {
    checkAvailability(startInput.value, endInput.value);
  });

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

  document.getElementById('newBookingBtn').addEventListener('click', () => {
    openNewBookingModal(startInput.value, endInput.value);
  });

  // Initial load
  await checkAvailability(today, today);
  await renderCalendar();
}

async function checkAvailability(startDate, endDate) {
  const resultsDiv = document.getElementById('availabilityResults');
  const summaryDiv = document.getElementById('availabilitySummary');
  const allTrailers = await getActiveTrailers();
  const availableTrailers = await getAvailableTrailers(startDate, endDate);
  const bookedTrailers = allTrailers.filter(t => !availableTrailers.some(a => a.id === t.id));

  summaryDiv.textContent = `${availableTrailers.length} of ${allTrailers.length} available`;

  const bookingsInRange = await getBookingsInRange(startDate, endDate);

  resultsDiv.innerHTML = `
    <div class="avail-column available">
      <div class="avail-column-header">
        <span class="avail-dot"></span>
        Available (${availableTrailers.length})
      </div>
      <div class="avail-list">
        ${availableTrailers.length > 0 ? availableTrailers.map(t => `
          <div class="avail-item" onclick="window.openBookingModal('${t.id}', '${startDate}', '${endDate}')">
            <span class="avail-item-name">${t.name}</span>
            <span class="avail-item-action">Book →</span>
          </div>
        `).join('') : `
          <div class="avail-empty">No trailers available</div>
        `}
      </div>
    </div>

    <div class="avail-column booked">
      <div class="avail-column-header">
        <span class="avail-dot"></span>
        Rented (${bookedTrailers.length})
      </div>
      <div class="avail-list">
        ${bookedTrailers.length > 0 ? bookedTrailers.map(t => {
          const bookings = bookingsInRange.filter(b => b.trailer_id === t.id);
          const booking = bookings[0];
          return `
            <div class="avail-item" style="cursor: default;">
              <span class="avail-item-name">${t.name}</span>
              <span class="avail-item-customer">${booking ? booking.customer_name : 'Booked'}</span>
            </div>
          `;
        }).join('') : `
          <div class="avail-empty">All trailers available!</div>
        `}
      </div>
    </div>
  `;
}

async function renderCalendar() {
  const monthYearEl = document.getElementById('monthYear');
  if (!monthYearEl) return; // View was navigated away
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  monthYearEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonth}`;
  const bookings = await getBookingsInRange(monthStart, monthEnd);
  const trailers = await getTrailers();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Build weeks array
  const weeks = [];
  let currentWeek = [];
  
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentWeek.push({ day, dateStr });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push(null);
  }
  if (currentWeek.length === 7) {
    weeks.push(currentWeek);
  }

  // Get all trailers for consistent row ordering
  const allTrailerIds = trailers.map(t => t.id);
  const rowHeight = 24;
  const dayMinHeight = 28 + (allTrailerIds.length * rowHeight);

  let html = `
    <style>
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
      }
      .cal-header {
        background: #f9fafb;
        padding: 10px;
        text-align: center;
        font-weight: 700;
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        border-bottom: 1px solid var(--line);
        border-right: 1px solid var(--line);
      }
      .cal-header:nth-child(7n) { border-right: none; }
      .cal-day {
        background: #fff;
        padding: 4px;
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        cursor: pointer;
        min-height: ${dayMinHeight}px;
      }
      .cal-day:nth-child(7n) { border-right: none; }
      .cal-day:hover { background: #fafbfc; }
      .cal-day.empty { background: #f9fafb; cursor: default; }
      .cal-day.today { outline: 2px solid var(--brand); outline-offset: -2px; }
      .cal-day-num { font-weight: 600; font-size: 12px; margin-bottom: 2px; padding: 2px 4px; }
      .cal-day.today .cal-day-num { color: var(--brand); font-weight: 700; }
      .cal-row { height: ${rowHeight - 2}px; margin-bottom: 1px; display: flex; }      .cal-bar {
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 4px;
        font-size: 9px;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        flex: 1;
      }
      .cal-bar:hover { filter: brightness(1.1); }
      .cal-bar.start { margin-left: 66%; border-radius: 2px 0 0 2px; }
      .cal-bar.end { margin-right: 66%; border-radius: 0 2px 2px 0; }
      .cal-bar.single { margin-left: 33%; margin-right: 33%; border-radius: 2px; }
      .cal-bar.mid { border-radius: 0; margin-left: -1px; margin-right: -1px; }
      .cal-bar.start.end { margin-left: 66%; margin-right: 66%; border-radius: 2px; }
    </style>
    <div class="cal-grid">
      <div class="cal-header">Sun</div>
      <div class="cal-header">Mon</div>
      <div class="cal-header">Tue</div>
      <div class="cal-header">Wed</div>
      <div class="cal-header">Thu</div>
      <div class="cal-header">Fri</div>
      <div class="cal-header">Sat</div>
  `;

  weeks.forEach(week => {
    week.forEach(dayData => {
      if (!dayData) {
        html += `<div class="cal-day empty"></div>`;
      } else {
        const isToday = dayData.dateStr === todayStr;
        html += `<div class="cal-day ${isToday ? 'today' : ''}" onclick="window.handleDayClick('${dayData.dateStr}')">`;
        html += `<div class="cal-day-num">${dayData.day}</div>`;
        
        allTrailerIds.forEach(trailerId => {
          const trailer = trailers.find(t => t.id === trailerId);
          const color = TRAILER_COLORS[trailers.findIndex(t => t.id === trailerId) % TRAILER_COLORS.length];
          const booking = bookings.find(b => 
            b.trailer_id === trailerId && 
            b.start_date <= dayData.dateStr && 
            b.end_date >= dayData.dateStr
          );
          
          html += `<div class="cal-row">`;
          
          if (booking) {
            const isStart = booking.start_date === dayData.dateStr;
            const isEnd = booking.end_date === dayData.dateStr;
            
            // Check if this is the second day of the booking
            const startDate = new Date(booking.start_date + 'T00:00:00');
            const thisDate = new Date(dayData.dateStr + 'T00:00:00');
            const dayDiff = Math.round((thisDate - startDate) / (1000 * 60 * 60 * 24));
            const isSecondDay = dayDiff === 1;
            
            let barClass = 'cal-bar';
            if (isStart && isEnd) barClass += ' single';
            else if (isStart) barClass += ' start';
            else if (isEnd) barClass += ' end';
            else barClass += ' mid';
            
            let label = '';
            if (isStart) label = trailer?.name || '';
            else if (isSecondDay) label = booking.customer_name;
            
            html += `<div class="${barClass}" style="background: ${color};" 
                         onclick="event.stopPropagation(); window.openEditBookingModal('${booking.id}')"
                         title="${trailer?.name} - ${booking.customer_name}">${label}</div>`;
          }
          
          html += `</div>`;
        });
        
        html += `</div>`;
      }
    });
  });

  html += '</div>';
  const calendarGrid = document.getElementById('calendarGrid');
  if (calendarGrid) {
    calendarGrid.innerHTML = html;
  }
}

// Global handlers
window.handleDayClick = function(dateStr) {
  document.getElementById('startDate').value = dateStr;
  document.getElementById('endDate').value = dateStr;
  document.getElementById('endDate').min = dateStr;
  checkAvailability(dateStr, dateStr);
};

window.openBookingModal = async function(trailerId, startDate, endDate) {
  const trailers = await getActiveTrailers();
  const trailer = trailers.find(t => t.id === trailerId);
  const customers = await getCustomers();

  const modalContent = `
    <h2>Book ${trailer.name}</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">${formatDate(startDate)}${startDate !== endDate ? ` → ${formatDate(endDate)}` : ''}</p>

    <form id="bookingForm">
      <div class="form-group">
        <label for="customerSearch">Customer *</label>
        <div style="position: relative;">
          <input type="text" id="customerSearch" required placeholder="Search or enter new customer..." autocomplete="off">
          <div id="customerDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15); max-height: 200px; overflow-y: auto; z-index: 100;"></div>
        </div>
        <input type="hidden" id="selectedCustomerId" value="">
      </div>

      <div class="form-group">
        <label for="customerPhone">Phone *</label>
        <input type="tel" id="customerPhone" required placeholder="(555) 123-4567">
      </div>

      <div class="form-group">
        <label for="deliveryAddress">Delivery Address *</label>
        <input type="text" id="deliveryAddress" required placeholder="123 Main St, City, MI">
      </div>

      <div class="form-group">
        <label for="priceQuoted">Price Quoted ($) *</label>
        <input type="number" id="priceQuoted" required min="0" step="0.01" placeholder="0.00">
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" rows="2" placeholder="Any additional notes..."></textarea>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Booking</button>
      </div>
    </form>
  `;

  openModal(modalContent);
  setupCustomerAutocomplete(customers);

  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedCustomerId = document.getElementById('selectedCustomerId').value;
    const customerName = document.getElementById('customerSearch').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();

    let customerId = selectedCustomerId || null;

    // If no existing customer selected, create a new one
    if (!customerId && customerName) {
      const newCustomer = await addCustomer({
        name: customerName,
        phone: customerPhone,
        address: deliveryAddress
      });
      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    const bookingData = {
      trailerId: trailerId,
      customerId: customerId,
      customerName: customerName,
      customerPhone: customerPhone,
      deliveryAddress: deliveryAddress,
      startDate: startDate,
      endDate: endDate,
      priceQuoted: parseFloat(document.getElementById('priceQuoted').value),
      notes: document.getElementById('notes').value.trim()
    };

    await addBooking(bookingData);
    closeModal();
    await loadBookingsView();
  });
};

async function openNewBookingModal(startDate, endDate) {
  const trailers = await getActiveTrailers();
  const availableTrailers = await getAvailableTrailers(startDate, endDate);
  const customers = await getCustomers();

  if (availableTrailers.length === 0) {
    alert('No trailers available for the selected dates.');
    return;
  }

  const modalContent = `
    <h2>New Booking</h2>

    <form id="bookingForm">
      <div class="form-group">
        <label for="trailerId">Trailer *</label>
        <select id="trailerId" required>
          <option value="">Select a trailer...</option>
          ${availableTrailers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="form-group">
          <label for="modalStartDate">Pickup Date *</label>
          <input type="date" id="modalStartDate" required value="${startDate}">
        </div>
        <div class="form-group">
          <label for="modalEndDate">Return Date *</label>
          <input type="date" id="modalEndDate" required value="${endDate}">
        </div>
      </div>

      <div class="form-group">
        <label for="customerSearch">Customer *</label>
        <div style="position: relative;">
          <input type="text" id="customerSearch" required placeholder="Search or enter new customer..." autocomplete="off">
          <div id="customerDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15); max-height: 200px; overflow-y: auto; z-index: 100;"></div>
        </div>
        <input type="hidden" id="selectedCustomerId" value="">
      </div>

      <div class="form-group">
        <label for="customerPhone">Phone *</label>
        <input type="tel" id="customerPhone" required placeholder="(555) 123-4567">
      </div>

      <div class="form-group">
        <label for="deliveryAddress">Delivery Address *</label>
        <input type="text" id="deliveryAddress" required placeholder="123 Main St, City, MI">
      </div>

      <div class="form-group">
        <label for="priceQuoted">Price Quoted ($) *</label>
        <input type="number" id="priceQuoted" required min="0" step="0.01" placeholder="0.00">
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" rows="2" placeholder="Any additional notes..."></textarea>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Booking</button>
      </div>
    </form>
  `;

  openModal(modalContent);
  setupCustomerAutocomplete(customers);

  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedCustomerId = document.getElementById('selectedCustomerId').value;
    const customerName = document.getElementById('customerSearch').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();

    let customerId = selectedCustomerId || null;

    // If no existing customer selected, create a new one
    if (!customerId && customerName) {
      const newCustomer = await addCustomer({
        name: customerName,
        phone: customerPhone,
        address: deliveryAddress
      });
      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    const bookingData = {
      trailerId: document.getElementById('trailerId').value,
      customerId: customerId,
      customerName: customerName,
      customerPhone: customerPhone,
      deliveryAddress: deliveryAddress,
      startDate: document.getElementById('modalStartDate').value,
      endDate: document.getElementById('modalEndDate').value,
      priceQuoted: parseFloat(document.getElementById('priceQuoted').value),
      notes: document.getElementById('notes').value.trim()
    };

    await addBooking(bookingData);
    closeModal();
    await loadBookingsView();
  });
}

window.openEditBookingModal = async function(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  const trailers = await getActiveTrailers();
  const trailer = trailers.find(t => t.id === booking.trailer_id);

  const modalContent = `
    <h2>Edit Booking</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">${trailer?.name || 'Unknown'}</p>

    <form id="editBookingForm">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="form-group">
          <label for="editStartDate">Pickup Date</label>
          <input type="date" id="editStartDate" value="${booking.start_date}">
        </div>
        <div class="form-group">
          <label for="editEndDate">Return Date</label>
          <input type="date" id="editEndDate" value="${booking.end_date}">
        </div>
      </div>

      <div class="form-group">
        <label for="customerName">Customer Name *</label>
        <input type="text" id="customerName" required value="${booking.customer_name}">
      </div>

      <div class="form-group">
        <label for="customerPhone">Phone *</label>
        <input type="tel" id="customerPhone" required value="${booking.customer_phone || ''}">
      </div>

      <div class="form-group">
        <label for="deliveryAddress">Delivery Address *</label>
        <input type="text" id="deliveryAddress" required value="${booking.delivery_address || ''}">
      </div>

      <div class="form-group">
        <label for="priceQuoted">Price Quoted ($) *</label>
        <input type="number" id="priceQuoted" required min="0" step="0.01" value="${booking.price_quoted || ''}">
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" rows="2">${booking.notes || ''}</textarea>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-danger" style="margin-right: auto;" onclick="window.deleteBookingConfirm(${bookingId})">Delete</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;

  openModal(modalContent);

  document.getElementById('editBookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookingData = {
      customerName: document.getElementById('customerName').value.trim(),
      customerPhone: document.getElementById('customerPhone').value.trim(),
      deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
      startDate: document.getElementById('editStartDate').value,
      endDate: document.getElementById('editEndDate').value,
      priceQuoted: parseFloat(document.getElementById('priceQuoted').value),
      notes: document.getElementById('notes').value.trim()
    };

    await updateBooking(bookingId, bookingData);
    closeModal();
    await loadBookingsView();
  });
};

window.deleteBookingConfirm = async function(bookingId) {
  if (confirm('Are you sure you want to delete this booking?')) {
    await deleteBooking(bookingId);
    closeModal();
    await loadBookingsView();
  }
};


function setupCustomerAutocomplete(customers) {
  const searchInput = document.getElementById('customerSearch');
  const dropdown = document.getElementById('customerDropdown');
  const customerIdInput = document.getElementById('selectedCustomerId');
  const phoneInput = document.getElementById('customerPhone');
  const addressInput = document.getElementById('deliveryAddress');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    customerIdInput.value = ''; // Clear selection when typing
    
    if (query.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query))
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 12px; color: var(--muted); font-size: 13px;">
          No matches — will create new customer
        </div>
      `;
    } else {
      dropdown.innerHTML = matches.map(c => `
        <div class="customer-option" data-id="${c.id}" data-name="${c.name}" data-phone="${c.phone || ''}" data-address="${c.address || ''}" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--line);">
          <div style="font-weight: 600;">${c.name}</div>
          ${c.phone ? `<div style="font-size: 12px; color: var(--muted);">${c.phone}</div>` : ''}
        </div>
      `).join('');
    }

    dropdown.style.display = 'block';
  });

  dropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.customer-option');
    if (option) {
      searchInput.value = option.dataset.name;
      customerIdInput.value = option.dataset.id;
      phoneInput.value = option.dataset.phone;
      addressInput.value = option.dataset.address;
      dropdown.style.display = 'none';
    }
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
      searchInput.dispatchEvent(new Event('input'));
    }
  });
}
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}