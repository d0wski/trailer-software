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
  await Promise.all([
    checkAvailability(today, today),
    renderCalendar()
  ]);
}

async function checkAvailability(startDate, endDate) {
  const resultsDiv = document.getElementById('availabilityResults');
  const summaryDiv = document.getElementById('availabilitySummary');
  
  const [allTrailers, bookingsInRange] = await Promise.all([
    getActiveTrailers(),
    getBookingsInRange(startDate, endDate)
  ]);
  
  const bookedTrailerIds = new Set(
    bookingsInRange
      .filter(b => b.start_date <= endDate && b.end_date >= startDate)
      .map(b => b.trailer_id)
  );
  const availableTrailers = allTrailers.filter(t => !bookedTrailerIds.has(t.id));
  const bookedTrailers = allTrailers.filter(t => bookedTrailerIds.has(t.id));

  summaryDiv.textContent = `${availableTrailers.length} of ${allTrailers.length} available`;

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
  if (!monthYearEl) return;
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  monthYearEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonth}`;
  
  const [bookings, trailers] = await Promise.all([
    getBookingsInRange(monthStart, monthEnd),
    getTrailers()
  ]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

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
      .cal-row { height: ${rowHeight - 2}px; margin-bottom: 1px; display: flex; }
      .cal-bar {
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
                         onclick="event.stopPropagation(); window.openBookingModal('${trailer.id}', '${booking.start_date}', '${booking.end_date}', '${booking.id}')"
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

// Helper to parse delivery time
function parseDeliveryTime(deliveryTime) {
  let result = {
    isTimeRange: false,
    hour: '', minute: '', ampm: 'AM',
    startHour: '', startMinute: '', startAmPm: 'AM',
    endHour: '', endMinute: '', endAmPm: 'AM'
  };

  if (!deliveryTime) return result;

  if (deliveryTime.includes(' - ')) {
    result.isTimeRange = true;
    const [startTime, endTime] = deliveryTime.split(' - ');
    const startMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    const endMatch = endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (startMatch) {
      result.startHour = startMatch[1];
      result.startMinute = startMatch[2];
      result.startAmPm = startMatch[3].toUpperCase();
    }
    if (endMatch) {
      result.endHour = endMatch[1];
      result.endMinute = endMatch[2];
      result.endAmPm = endMatch[3].toUpperCase();
    }
  } else {
    const match = deliveryTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      result.hour = match[1];
      result.minute = match[2];
      result.ampm = match[3].toUpperCase();
    }
  }

  return result;
}

// Helper to get delivery time from form
function getDeliveryTimeFromForm() {
  const isExactTime = document.getElementById('exactTimeGroup').style.display !== 'none';
  let deliveryTime = '';
  
  if (isExactTime) {
    const hour = document.getElementById('deliveryHour').value;
    const minute = document.getElementById('deliveryMinute').value || '00';
    const ampm = document.getElementById('deliveryAmPm').value;
    if (hour) {
      deliveryTime = `${hour}:${minute} ${ampm}`;
    }
  } else {
    const startHour = document.getElementById('deliveryStartHour').value;
    const startMinute = document.getElementById('deliveryStartMinute').value || '00';
    const startAmPm = document.getElementById('deliveryStartAmPm').value;
    const endHour = document.getElementById('deliveryEndHour').value;
    const endMinute = document.getElementById('deliveryEndMinute').value || '00';
    const endAmPm = document.getElementById('deliveryEndAmPm').value;
    if (startHour && endHour) {
      deliveryTime = `${startHour}:${startMinute} ${startAmPm} - ${endHour}:${endMinute} ${endAmPm}`;
    }
  }
  
  return deliveryTime;
}

// Helper to calculate totals from form
function calculateTotals() {
  const rentalRate = parseFloat(document.getElementById('rentalRate').value) || 0;
  const iceBagQty = parseInt(document.getElementById('iceBagQty').value) || 0;
  const icePricePerBag = parseFloat(document.getElementById('icePricePerBag').value) || 0;
  const roundTripMiles = parseFloat(document.getElementById('roundTripMiles').value) || 0;
  const pricePerMile = parseFloat(document.getElementById('pricePerMile').value) || 1.25;
  
  const iceTotal = iceBagQty * icePricePerBag;
  const billableMiles = Math.max(0, roundTripMiles - 20);
  const mileageTotal = billableMiles * pricePerMile;
  const totalPrice = rentalRate + iceTotal + mileageTotal;

  return { rentalRate, iceBagQty, icePricePerBag, roundTripMiles, pricePerMile, iceTotal, billableMiles, mileageTotal, totalPrice };
}

// Unified booking modal - handles both create and edit
window.openBookingModal = async function(trailerId, startDate, endDate, bookingId = null) {
  const isEdit = !!bookingId;
  
  const [trailers, customers, bookings] = await Promise.all([
    getActiveTrailers(),
    getCustomers(),
    isEdit ? getBookings() : Promise.resolve([])
  ]);
  
  const trailer = trailers.find(t => t.id === trailerId);
  const booking = isEdit ? bookings.find(b => b.id === bookingId) : null;

  // Parse existing delivery time for edit mode
  const timeData = isEdit ? parseDeliveryTime(booking?.delivery_time) : { isTimeRange: false, hour: '', minute: '', ampm: 'AM', startHour: '', startMinute: '', startAmPm: 'AM', endHour: '', endMinute: '', endAmPm: 'AM' };

  const modalContent = `
    <h2>${isEdit ? 'Edit Booking' : `Book ${trailer.name}`}</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">${isEdit ? (trailer?.name || 'Unknown') : ''} ${formatDate(startDate)}${startDate !== endDate ? ` → ${formatDate(endDate)}` : ''}</p>

    <form id="bookingForm">
      ${isEdit ? `
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
      ` : ''}

      <!-- Customer Information Section -->
      <div style="font-size: 13px; font-weight: 700; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Customer Information</div>
      
      ${isEdit ? `
        <div class="form-group">
          <label for="customerName">Customer Name *</label>
          <input type="text" id="customerName" required value="${booking.customer_name}">
        </div>
      ` : `
        <div class="form-group">
          <label for="customerSearch">Customer *</label>
          <div style="position: relative;">
            <input type="text" id="customerSearch" required placeholder="Search or enter new customer..." autocomplete="off">
            <div id="customerDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15); max-height: 200px; overflow-y: auto; z-index: 100;"></div>
          </div>
          <input type="hidden" id="selectedCustomerId" value="">
        </div>
      `}

      <div class="form-group">
        <label for="customerPhone">Phone *</label>
        <input type="tel" id="customerPhone" required placeholder="(555) 123-4567" value="${isEdit ? (booking.customer_phone || '') : ''}">
      </div>

      <div class="form-group">
        <label for="deliveryAddress">Delivery Address *</label>
        <input type="text" id="deliveryAddress" required placeholder="123 Main St, City, MI" value="${isEdit ? (booking.delivery_address || '') : ''}">
      </div>

      <div class="form-group">
        <label>Delivery Time</label>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <button type="button" class="btn ${timeData.isTimeRange ? 'btn-secondary' : 'btn-primary'}" id="exactTimeBtn" style="padding: 8px 16px;" onclick="document.getElementById('exactTimeGroup').style.display='flex'; document.getElementById('rangeTimeGroup').style.display='none'; this.classList.add('btn-primary'); this.classList.remove('btn-secondary'); document.getElementById('rangeTimeBtn').classList.remove('btn-primary'); document.getElementById('rangeTimeBtn').classList.add('btn-secondary');">Exact Time</button>
          <button type="button" class="btn ${timeData.isTimeRange ? 'btn-primary' : 'btn-secondary'}" id="rangeTimeBtn" style="padding: 8px 16px;" onclick="document.getElementById('exactTimeGroup').style.display='none'; document.getElementById('rangeTimeGroup').style.display='flex'; this.classList.add('btn-primary'); this.classList.remove('btn-secondary'); document.getElementById('exactTimeBtn').classList.remove('btn-primary'); document.getElementById('exactTimeBtn').classList.add('btn-secondary');">Time Range</button>
        </div>
        <div id="exactTimeGroup" style="display: ${timeData.isTimeRange ? 'none' : 'flex'}; align-items: center; gap: 6px;">
          <input type="text" id="deliveryHour" style="width: 60px; text-align: center;" placeholder="12" maxlength="2" value="${timeData.hour}">
          <span style="font-weight: 600;">:</span>
          <input type="text" id="deliveryMinute" style="width: 60px; text-align: center;" placeholder="00" maxlength="2" value="${timeData.minute}">
          <select id="deliveryAmPm" style="padding: 10px 12px; width: 80px; flex-shrink: 0;">
            <option value="AM" ${timeData.ampm === 'AM' ? 'selected' : ''}>AM</option>
            <option value="PM" ${timeData.ampm === 'PM' ? 'selected' : ''}>PM</option>
          </select>
        </div>
        <div id="rangeTimeGroup" style="display: ${timeData.isTimeRange ? 'flex' : 'none'}; align-items: center; gap: 6px;">
          <input type="text" id="deliveryStartHour" style="width: 50px; text-align: center;" placeholder="12" maxlength="2" value="${timeData.startHour}">
          <span style="font-weight: 600;">:</span>
          <input type="text" id="deliveryStartMinute" style="width: 60px; text-align: center;" placeholder="00" maxlength="2" value="${timeData.startMinute}">
          <select id="deliveryStartAmPm" style="padding: 10px 12px; width: 75px; flex-shrink: 0;">
            <option value="AM" ${timeData.startAmPm === 'AM' ? 'selected' : ''}>AM</option>
            <option value="PM" ${timeData.startAmPm === 'PM' ? 'selected' : ''}>PM</option>
          </select>
          <span style="margin: 0 8px;">to</span>
          <input type="text" id="deliveryEndHour" style="width: 50px; text-align: center;" placeholder="12" maxlength="2" value="${timeData.endHour}">
          <span style="font-weight: 600;">:</span>
          <input type="text" id="deliveryEndMinute" style="width: 60px; text-align: center;" placeholder="00" maxlength="2" value="${timeData.endMinute}">
          <select id="deliveryEndAmPm" style="padding: 10px 12px; width: 75px; flex-shrink: 0;">
            <option value="AM" ${timeData.endAmPm === 'AM' ? 'selected' : ''}>AM</option>
            <option value="PM" ${timeData.endAmPm === 'PM' ? 'selected' : ''}>PM</option>
          </select>
        </div>
      </div>

      <!-- Pricing Section -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <div style="font-size: 13px; font-weight: 700; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Pricing</div>
        
        <div class="form-group">
          <label for="rentalRate">Trailer Rental Quote ($) *</label>
          <input type="number" id="rentalRate" required min="0" step="0.01" placeholder="0.00" value="${isEdit ? (booking.rental_rate || '') : ''}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label for="iceBagSize">Ice Bag Size</label>
            <select id="iceBagSize">
              <option value="20lb" ${isEdit && booking.ice_bag_size === '20lb' ? 'selected' : ''}>20 lb bags</option>
              <option value="7lb" ${isEdit && booking.ice_bag_size === '7lb' ? 'selected' : ''}>7 lb bags</option>
            </select>
          </div>
          <div class="form-group">
            <label for="iceBagQty">Quantity</label>
            <input type="number" id="iceBagQty" min="0" placeholder="0" value="${isEdit ? (booking.ice_bag_qty || '') : ''}">
          </div>
          <div class="form-group">
            <label for="icePricePerBag">$/Bag</label>
            <input type="number" id="icePricePerBag" min="0" step="0.01" placeholder="0.00" value="${isEdit ? (booking.ice_price_per_bag || '') : ''}">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label for="roundTripMiles">Round Trip Miles</label>
            <input type="number" id="roundTripMiles" min="0" placeholder="0" value="${isEdit ? (booking.round_trip_miles || '') : ''}">
            <p style="font-size: 12px; color: #1f2937; margin-top: 4px;">First 20 miles free</p>
          </div>
          <div class="form-group">
            <label for="pricePerMile">$/Mile (after 20)</label>
            <input type="number" id="pricePerMile" min="0" step="0.01" placeholder="1.25" value="${isEdit ? (booking.price_per_mile || 1.25) : '1.25'}">
          </div>
        </div>
      </div>

      <!-- Order Summary Section -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <div style="font-size: 13px; font-weight: 700; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Order Summary</div>
        <div id="orderSummary">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #1f2937;">Trailer Rental</span>
            <span style="font-weight: 600;" id="summaryRental">$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #1f2937;" id="summaryIceLabel">Ice (0 × 20lb @ $0.00)</span>
            <span style="font-weight: 600;" id="summaryIce">$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
            <span style="color: #1f2937;" id="summaryMileageLabel">Mileage (0 billable mi)</span>
            <span style="font-weight: 600;" id="summaryMileage">$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0 0; font-size: 16px; font-weight: 700;">
            <span>Total</span>
            <span id="summaryTotal">$0.00</span>
          </div>
        </div>
      </div>

      <!-- Notes Section -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea id="notes" rows="2" placeholder="Any additional notes...">${isEdit ? (booking.notes || '') : ''}</textarea>
        </div>
      </div>

      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-danger" style="margin-right: auto;" onclick="window.deleteBookingConfirm('${bookingId}')">Delete</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Booking'}</button>
      </div>
    </form>
  `;

  openModal(modalContent);
  
  if (!isEdit) {
    setupCustomerAutocomplete(customers);
  }
  setupPricingCalculations();

  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const totals = calculateTotals();
    const deliveryTime = getDeliveryTimeFromForm();

    let customerName, customerId;
    
    if (isEdit) {
      customerName = document.getElementById('customerName').value.trim();
      customerId = booking.customer_id;
    } else {
      const selectedCustomerId = document.getElementById('selectedCustomerId').value;
      customerName = document.getElementById('customerSearch').value.trim();
      customerId = selectedCustomerId || null;

      // If no existing customer selected, create a new one
      if (!customerId && customerName) {
        const newCustomer = await addCustomer({
          name: customerName,
          phone: document.getElementById('customerPhone').value.trim(),
          address: document.getElementById('deliveryAddress').value.trim()
        });
        if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    const bookingData = {
      trailerId: trailerId,
      customerId: customerId,
      customerName: customerName,
      customerPhone: document.getElementById('customerPhone').value.trim(),
      deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
      deliveryTime: deliveryTime,
      startDate: isEdit ? document.getElementById('editStartDate').value : startDate,
      endDate: isEdit ? document.getElementById('editEndDate').value : endDate,
      priceQuoted: totals.totalPrice,
      rentalRate: totals.rentalRate,
      iceBagSize: document.getElementById('iceBagSize').value,
      iceBagQty: totals.iceBagQty,
      icePricePerBag: totals.icePricePerBag,
      roundTripMiles: totals.roundTripMiles,
      pricePerMile: totals.pricePerMile,
      notes: document.getElementById('notes').value.trim()
    };

    if (isEdit) {
      await updateBooking(bookingId, bookingData);
    } else {
      await addBooking(bookingData);
    }
    
    // Send email notification
    try {
      emailjs.init('GoXpbvNpRYvfRj7xQ');
      await emailjs.send('service_7aaghj9', 'template_4b96i2o', {
        subject: `${isEdit ? 'Updated' : 'New'} Booking: ${bookingData.customerName}`,
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #012340;">${isEdit ? 'Booking Updated' : 'New Booking'}</h2>
            
            <h3 style="margin-top: 24px; color: #374151;">Customer</h3>
            <p><strong>Name:</strong> ${bookingData.customerName}</p>
            <p><strong>Phone:</strong> ${bookingData.customerPhone}</p>
            <p><strong>Address:</strong> ${bookingData.deliveryAddress}</p>
            
            <h3 style="margin-top: 24px; color: #374151;">Rental Details</h3>
            <p><strong>Trailer:</strong> ${trailer?.name || 'Unknown'}</p>
            <p><strong>Pickup:</strong> ${bookingData.startDate}</p>
            <p><strong>Return:</strong> ${bookingData.endDate}</p>
            <p><strong>Delivery Time:</strong> ${bookingData.deliveryTime || 'Not specified'}</p>
            
            <h3 style="margin-top: 24px; color: #374151;">Pricing</h3>
            <p><strong>Rental:</strong> $${bookingData.rentalRate || 0}</p>
            <p><strong>Ice:</strong> ${bookingData.iceBagQty || 0} × ${bookingData.iceBagSize || '20lb'} @ $${bookingData.icePricePerBag || 0}</p>
            <p><strong>Mileage:</strong> ${bookingData.roundTripMiles || 0} miles @ $${bookingData.pricePerMile || 0}/mile = $${(Math.max(0, (bookingData.roundTripMiles || 0) - 20) * (bookingData.pricePerMile || 0)).toFixed(2)}</p>
            <p style="font-size: 18px; margin-top: 16px;"><strong>Total: $${bookingData.priceQuoted}</strong></p>
            
            ${bookingData.notes ? `<h3 style="margin-top: 24px; color: #374151;">Notes</h3><p>${bookingData.notes}</p>` : ''}
          </div>
        `
      });
    } catch (e) {
      console.error('Failed to send email:', e);
    }
    
    closeModal();
    await loadBookingsView();
  });
};

// Keep this for backwards compatibility with calendar clicks
window.openEditBookingModal = async function(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (booking) {
    window.openBookingModal(booking.trailer_id, booking.start_date, booking.end_date, bookingId);
  }
};

async function openNewBookingModal(startDate, endDate) {
  const [trailers, bookingsInRange, customers] = await Promise.all([
    getActiveTrailers(),
    getBookingsInRange(startDate, endDate),
    getCustomers()
  ]);
  
  const bookedTrailerIds = new Set(bookingsInRange.map(b => b.trailer_id));
  const availableTrailers = trailers.filter(t => !bookedTrailerIds.has(t.id));

  if (availableTrailers.length === 0) {
    alert('No trailers available for the selected dates.');
    return;
  }

  // If only one trailer available, go directly to booking modal
  if (availableTrailers.length === 1) {
    window.openBookingModal(availableTrailers[0].id, startDate, endDate);
    return;
  }

  // Otherwise show trailer selection
  const modalContent = `
    <h2>Select Trailer</h2>
    <p style="color: var(--muted); margin-bottom: 20px;">${formatDate(startDate)}${startDate !== endDate ? ` → ${formatDate(endDate)}` : ''}</p>

    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${availableTrailers.map(t => `
        <div class="avail-item" style="padding: 14px; border: 1px solid var(--line); cursor: pointer;" onclick="closeModal(); window.openBookingModal('${t.id}', '${startDate}', '${endDate}')">
          <span class="avail-item-name">${t.name}</span>
          <span class="avail-item-action">Select →</span>
        </div>
      `).join('')}
    </div>

    <div class="modal-actions" style="margin-top: 20px;">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `;

  openModal(modalContent);
}

window.deleteBookingConfirm = async function(bookingId) {
  const modalContent = `
    <h2 style="color: #991b1b;">Delete Booking</h2>
    <p>Are you sure you want to permanently delete this booking?</p>
    <p style="margin-top: 16px;">Type <strong>delete</strong> to confirm:</p>
    <div class="form-group">
      <input type="text" id="deleteConfirmInput" placeholder="Type 'delete' here" autocomplete="off">
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal();">Cancel</button>
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
      await deleteBooking(bookingId);
      closeModal();
      await loadBookingsView();
    }
  });
};

function setupPricingCalculations() {
  const rentalInput = document.getElementById('rentalRate');
  const iceSizeSelect = document.getElementById('iceBagSize');
  const iceQtyInput = document.getElementById('iceBagQty');
  const icePriceInput = document.getElementById('icePricePerBag');
  const milesInput = document.getElementById('roundTripMiles');
  const perMileInput = document.getElementById('pricePerMile');

  function updateSummary() {
    const rental = parseFloat(rentalInput.value) || 0;
    const iceSize = iceSizeSelect.value;
    const iceQty = parseInt(iceQtyInput.value) || 0;
    const icePrice = parseFloat(icePriceInput.value) || 0;
    const miles = parseFloat(milesInput.value) || 0;
    const perMile = parseFloat(perMileInput.value) || 0;

    const iceTotal = iceQty * icePrice;
    const billableMiles = Math.max(0, miles - 20);
    const mileageTotal = billableMiles * perMile;
    const grandTotal = rental + iceTotal + mileageTotal;

    document.getElementById('summaryRental').textContent = `$${rental.toFixed(2)}`;
    document.getElementById('summaryIceLabel').textContent = `Ice (${iceQty} × ${iceSize} @ $${icePrice.toFixed(2)})`;
    document.getElementById('summaryIce').textContent = `$${iceTotal.toFixed(2)}`;
    document.getElementById('summaryMileageLabel').textContent = `Mileage (${billableMiles} billable mi)`;
    document.getElementById('summaryMileage').textContent = `$${mileageTotal.toFixed(2)}`;
    document.getElementById('summaryTotal').textContent = `$${grandTotal.toFixed(2)}`;
  }

  [rentalInput, iceSizeSelect, iceQtyInput, icePriceInput, milesInput, perMileInput].forEach(el => {
    el.addEventListener('input', updateSummary);
    el.addEventListener('change', updateSummary);
  });

  // Trigger initial calculation
  updateSummary();
}

function setupCustomerAutocomplete(customers) {
  const searchInput = document.getElementById('customerSearch');
  const dropdown = document.getElementById('customerDropdown');
  const customerIdInput = document.getElementById('selectedCustomerId');
  const phoneInput = document.getElementById('customerPhone');
  const addressInput = document.getElementById('deliveryAddress');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    customerIdInput.value = '';
    
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