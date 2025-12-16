// home-view.js - Dashboard

import { getBookings, getActiveTrailers } from '../store.js';

export async function loadHomeView() {
  const main = document.querySelector('.main');
  const today = new Date().toISOString().split('T')[0];
  
  // Get current month range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  // Get next 7 days
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [bookings, trailers] = await Promise.all([
    getBookings(),
    getActiveTrailers()
  ]);

  // Calculate KPIs
  const todaysPickups = bookings.filter(b => b.start_date === today);
  const todaysReturns = bookings.filter(b => b.end_date === today);
  const currentlyRented = bookings.filter(b => b.start_date <= today && b.end_date >= today);
  const availableCount = trailers.length - currentlyRented.length;
  
  const monthBookings = bookings.filter(b => b.start_date >= monthStart && b.start_date <= monthEnd);
  const monthRevenue = monthBookings.reduce((sum, b) => sum + (parseFloat(b.price_quoted) || 0), 0);
  
  const upcomingBookings = bookings
    .filter(b => b.start_date >= today && b.start_date <= weekEnd)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  main.innerHTML = `
    <div class="card">
      <h1>Dashboard</h1>
      
      <div class="kpi-grid" class="grid-auto">
        <div class="kpi">
          <div class="label">Today's Pickups</div>
          <div class="value">${todaysPickups.length}</div>
        </div>
        <div class="kpi">
          <div class="label">Today's Returns</div>
          <div class="value">${todaysReturns.length}</div>
        </div>
        <div class="kpi">
          <div class="label">Currently Rented</div>
          <div class="value">${currentlyRented.length} / ${trailers.length}</div>
        </div>
        <div class="kpi">
          <div class="label">Available Now</div>
          <div class="value ${availableCount > 0 ? 'text-success' : 'text-danger'}">${availableCount}</div>
        </div>
        <div class="kpi">
          <div class="label">Revenue This Month</div>
          <div class="value">$${monthRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div class="form-row" style="gap: 24px;">
        <div class="panel">
          <h2>Today's Activity</h2>
          ${todaysPickups.length > 0 || todaysReturns.length > 0 ? `
            <div class="avail-list">
              ${todaysPickups.map(b => {
                const trailer = trailers.find(t => t.id === b.trailer_id);
                return `
                  <div class="activity-item activity-pickup">
                    <div>
                      <strong>${b.customer_name}</strong>
                      <div class="text-muted" style="font-size: 12px;">${trailer?.name || 'Unknown'}${b.delivery_time ? ` · <span style="color: #012340; font-weight: 600;">${b.delivery_time}</span>` : ''}</div>
                    </div>
                    <span class="pill green">Pickup</span>
                  </div>
                `;
              }).join('')}
              ${todaysReturns.map(b => {
                const trailer = trailers.find(t => t.id === b.trailer_id);
                return `
                  <div class="activity-item activity-return">
                    <div>
                      <strong>${b.customer_name}</strong>
                      <div style="font-size: 12px; color: var(--muted);">${trailer?.name || 'Unknown'}</div>
                    </div>
                    <span class="pill red">Return</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <p class="empty-state" style="padding: 20px 0;">No pickups or returns today</p>
          `}
        </div>

        <div class="panel">
          <h2>Upcoming This Week</h2>
          ${upcomingBookings.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${upcomingBookings.slice(0, 8).map(b => {
                const trailer = trailers.find(t => t.id === b.trailer_id);
                const isToday = b.start_date === today;
                return `
                  <div class="activity-item">
                    <div>
                      <strong>${b.customer_name}</strong>
                      <div class="text-muted" style="font-size: 12px;">${trailer?.name || 'Unknown'}${b.delivery_time ? ` · <span style="color: #012340; font-weight: 600;">${b.delivery_time}</span>` : ''}</div>
                    </div>
                    <div style="text-align: right;">
                      <div class="${isToday ? 'text-brand font-semibold' : 'font-semibold'}" style="font-size: 13px;">${isToday ? 'Today' : formatDateShort(b.start_date)}</div>
                      ${b.price_quoted ? `<div style="font-size: 12px; color: var(--muted);">$${parseFloat(b.price_quoted).toLocaleString()}</div>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            ${upcomingBookings.length > 8 ? `<p class="text-muted text-center" style="font-size: 13px; margin-top: 12px;">+${upcomingBookings.length - 8} more</p>` : ''}
          ` : `
            <p class="empty-state" style="padding: 20px 0;">No upcoming bookings this week</p>
          `}
        </div>
      </div>

      <div class="panel mt-3">
        <h2>Currently Rented</h2>
        ${currentlyRented.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Trailer</th>
                <th>Customer</th>
                <th>Return Date</th>
                <th>Days Left</th>
              </tr>
            </thead>
            <tbody>
              ${currentlyRented.map(b => {
                const trailer = trailers.find(t => t.id === b.trailer_id);
                const endDate = new Date(b.end_date + 'T00:00:00');
                const todayDate = new Date(today + 'T00:00:00');
                const daysLeft = Math.ceil((endDate - todayDate) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                const isDueToday = daysLeft === 0;
                
                return `
                  <tr>
                    <td><strong>${trailer?.name || 'Unknown'}</strong></td>
                    <td>${b.customer_name}</td>
                    <td>${formatDateShort(b.end_date)}</td>
                    <td>
                      <span class="pill ${isOverdue ? 'red' : isDueToday ? 'yellow' : 'green'}">
                        ${isOverdue ? `${Math.abs(daysLeft)} days overdue` : isDueToday ? 'Due today' : `${daysLeft} days`}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `
          <p class="empty-state" style="padding: 20px 0;">No trailers currently rented</p>
        `}
      </div>
    </div>
  `;
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}