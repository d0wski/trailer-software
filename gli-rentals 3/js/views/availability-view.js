// availability-view.js - Quick availability checker

import { getActiveTrailers, getAvailableTrailers, getBookingsForTrailer, TRAILER_CATEGORIES } from '../store.js';

export function loadAvailabilityView() {
  const main = document.querySelector('.main');
  const today = new Date().toISOString().split('T')[0];
  
  main.innerHTML = `
    <div class="card">
      <h1>Check Availability</h1>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: end; margin-bottom: 24px; max-width: 600px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label for="startDate">Start Date</label>
          <input type="date" id="startDate" value="${today}" min="${today}">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label for="endDate">End Date</label>
          <input type="date" id="endDate" value="${today}" min="${today}">
        </div>
        <button class="btn btn-primary" id="checkBtn">Check</button>
      </div>

      <div id="availabilityResults">
        <!-- Results will load here -->
      </div>
    </div>
  `;

  // Set up event listeners
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const checkBtn = document.getElementById('checkBtn');

  // Ensure end date is not before start date
  startInput.addEventListener('change', () => {
    if (endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
    endInput.min = startInput.value;
  });

  // Check availability on button click
  checkBtn.addEventListener('click', () => {
    checkAvailability(startInput.value, endInput.value);
  });

  // Check on enter key
  [startInput, endInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        checkAvailability(startInput.value, endInput.value);
      }
    });
  });

  // Initial check for today
  checkAvailability(today, today);
}

function getCategoryName(categoryId) {
  const cat = TRAILER_CATEGORIES.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

function checkAvailability(startDate, endDate) {
  const resultsDiv = document.getElementById('availabilityResults');
  const allTrailers = getActiveTrailers();
  const availableTrailers = getAvailableTrailers(startDate, endDate);
  const unavailableTrailers = allTrailers.filter(t => !availableTrailers.some(a => a.id === t.id));

  const dateDisplay = startDate === endDate 
    ? formatDate(startDate)
    : `${formatDate(startDate)} - ${formatDate(endDate)}`;

  resultsDiv.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h2 style="font-size: 18px; margin: 0 0 4px;">Results for ${dateDisplay}</h2>
      <p style="color: var(--muted); margin: 0; font-size: 14px;">
        ${availableTrailers.length} of ${allTrailers.length} trailers available
      </p>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div class="panel">
        <h2 style="color: #166534;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #22c55e; border-radius: 50%; margin-right: 8px;"></span>
          Available (${availableTrailers.length})
        </h2>
        ${availableTrailers.length > 0 ? `
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${availableTrailers.map(t => `
              <li style="padding: 12px 8px; border-bottom: 1px solid var(--line);">
                <strong>${t.name}</strong>
                <div style="font-size: 13px; color: var(--muted);">${getCategoryName(t.category)}</div>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p style="color: var(--muted); padding: 20px 0; text-align: center;">No trailers available</p>
        `}
      </div>

      <div class="panel">
        <h2 style="color: #991b1b;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; margin-right: 8px;"></span>
          Booked (${unavailableTrailers.length})
        </h2>
        ${unavailableTrailers.length > 0 ? `
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${unavailableTrailers.map(t => {
              // Find the conflicting booking
              const bookings = getBookingsForTrailer(t.id);
              const conflict = bookings.find(b => b.startDate <= endDate && b.endDate >= startDate);
              return `
                <li style="padding: 12px 8px; border-bottom: 1px solid var(--line);">
                  <strong>${t.name}</strong>
                  <div style="font-size: 13px; color: var(--muted);">${getCategoryName(t.category)}</div>
                  ${conflict ? `
                    <div style="font-size: 12px; color: #991b1b; margin-top: 4px;">
                      Booked: ${conflict.customerName} (${formatDateRange(conflict.startDate, conflict.endDate)})
                    </div>
                  ` : ''}
                </li>
              `;
            }).join('')}
          </ul>
        ` : `
          <p style="color: var(--muted); padding: 20px 0; text-align: center;">All trailers available!</p>
        `}
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateRange(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const options = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}
