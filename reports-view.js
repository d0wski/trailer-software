// reports-view.js - Financial reports

import { getBookings, getTrailers, getCustomers } from '../store.js';

let currentRange = 'this-month';
let customStart = '';
let customEnd = '';

export async function loadReportsView() {
  const main = document.querySelector('.main');
  const today = new Date();
  
  // Set default custom range to this month
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  customStart = firstOfMonth.toISOString().split('T')[0];
  customEnd = today.toISOString().split('T')[0];

  main.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
        <h1 style="margin: 0;">Reports</h1>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <select id="rangeSelect" style="padding: 8px 12px; border: 1px solid var(--line); border-radius: 6px; font-size: 14px;">
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="all-time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          <div id="customRangeInputs" style="display: none; gap: 8px;">
            <input type="date" id="customStart" value="${customStart}" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px;">
            <span style="align-self: center;">to</span>
            <input type="date" id="customEnd" value="${customEnd}" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px;">
            <button class="btn btn-primary btn-sm" id="applyCustomRange">Apply</button>
          </div>
        </div>
      </div>
      
      <div id="reportContent">
        <p style="text-align: center; color: var(--muted); padding: 40px;">Loading reports...</p>
      </div>
    </div>
  `;

  document.getElementById('rangeSelect').addEventListener('change', (e) => {
    currentRange = e.target.value;
    const customInputs = document.getElementById('customRangeInputs');
    if (currentRange === 'custom') {
      customInputs.style.display = 'flex';
    } else {
      customInputs.style.display = 'none';
      renderReports();
    }
  });

  document.getElementById('applyCustomRange').addEventListener('click', () => {
    customStart = document.getElementById('customStart').value;
    customEnd = document.getElementById('customEnd').value;
    renderReports();
  });

  await renderReports();
}

function getDateRange() {
  const today = new Date();
  let start, end;

  switch (currentRange) {
    case 'this-month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'last-month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'this-year':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case 'last-year':
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31);
      break;
    case 'all-time':
      start = new Date(2000, 0, 1);
      end = new Date(2100, 11, 31);
      break;
    case 'custom':
      start = new Date(customStart + 'T00:00:00');
      end = new Date(customEnd + 'T00:00:00');
      break;
    default:
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    startDate: start,
    endDate: end
  };
}

async function renderReports() {
  const contentDiv = document.getElementById('reportContent');
  const { start, end, startDate, endDate } = getDateRange();
  
  const allBookings = await getBookings();
  const trailers = await getTrailers();
  const customers = await getCustomers();
  
  // Filter bookings by date range (based on start_date)
  const bookings = allBookings.filter(b => b.start_date >= start && b.start_date <= end);
  
  // Calculate KPIs
  const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.price_quoted) || 0), 0);
  const totalBookings = bookings.length;
  const totalDays = bookings.reduce((sum, b) => {
    const s = new Date(b.start_date);
    const e = new Date(b.end_date);
    return sum + Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, 0);
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const avgBookingLength = totalBookings > 0 ? totalDays / totalBookings : 0;
  
  
  // Revenue by trailer
  const revenueByTrailer = {};
  const daysByTrailer = {};
  trailers.forEach(t => {
    revenueByTrailer[t.id] = 0;
    daysByTrailer[t.id] = 0;
  });
  bookings.forEach(b => {
    if (revenueByTrailer[b.trailer_id] !== undefined) {
      revenueByTrailer[b.trailer_id] += parseFloat(b.price_quoted) || 0;
      const s = new Date(b.start_date);
      const e = new Date(b.end_date);
      daysByTrailer[b.trailer_id] += Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    }
  });
  
  const trailerStats = trailers
    .map(t => ({
      name: t.name,
      revenue: revenueByTrailer[t.id] || 0,
      days: daysByTrailer[t.id] || 0,
      bookings: bookings.filter(b => b.trailer_id === t.id).length
    }))
    .sort((a, b) => b.revenue - a.revenue);
  
  // Revenue by month
  const revenueByMonth = {};
  bookings.forEach(b => {
    const month = b.start_date.substring(0, 7); // YYYY-MM
    revenueByMonth[month] = (revenueByMonth[month] || 0) + (parseFloat(b.price_quoted) || 0);
  });
  const monthlyStats = Object.entries(revenueByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, revenue]) => ({
      month: formatMonth(month),
      revenue
    }));
  
  // Top customers
  const revenueByCustomer = {};
  bookings.forEach(b => {
    const key = b.customer_id || b.customer_name || 'Unknown';
    const name = b.customer_name || 'Unknown';
    if (!revenueByCustomer[key]) {
      revenueByCustomer[key] = { name, revenue: 0, bookings: 0, days: 0 };
    }
    revenueByCustomer[key].revenue += parseFloat(b.price_quoted) || 0;
    revenueByCustomer[key].bookings += 1;
    const s = new Date(b.start_date);
    const e = new Date(b.end_date);
    revenueByCustomer[key].days += Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  });
  const topCustomers = Object.values(revenueByCustomer)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Range label
  const rangeLabels = {
    'this-month': 'This Month',
    'last-month': 'Last Month',
    'this-year': 'This Year',
    'last-year': 'Last Year',
    'all-time': 'All Time',
    'custom': `${formatDateShort(start)} - ${formatDateShort(end)}`
  };
  const rangeLabel = rangeLabels[currentRange];

  contentDiv.innerHTML = `
    <p style="color: var(--muted); margin-bottom: 16px; font-size: 14px;">
      Showing data for: <strong>${rangeLabel}</strong>
      ${currentRange !== 'all-time' ? ` (${formatDateShort(start)} - ${formatDateShort(end)})` : ''}
    </p>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px;">
      <div class="kpi">
        <div class="label">Total Revenue</div>
        <div class="value">$${totalRevenue.toLocaleString()}</div>
      </div>
      <div class="kpi">
        <div class="label">Total Bookings</div>
        <div class="value">${totalBookings}</div>
      </div>
      <div class="kpi">
        <div class="label">Days Rented</div>
        <div class="value">${totalDays}</div>
      </div>
      <div class="kpi">
        <div class="label">Avg Booking Value</div>
        <div class="value">$${avgBookingValue.toFixed(0)}</div>
      </div>
      <div class="kpi">
        <div class="label">Avg Booking Length</div>
        <div class="value">${avgBookingLength.toFixed(1)} days</div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div class="panel">
        <h2>Revenue by Trailer</h2>
        ${trailerStats.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Trailer</th>
                <th>Bookings</th>
                <th>Days</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${trailerStats.map(t => `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td>${t.bookings}</td>
                  <td>${t.days}</td>
                  <td>$${t.revenue.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="color: var(--muted); text-align: center; padding: 20px;">No data</p>'}
      </div>
      
      <div class="panel">
        <h2>Top Customers</h2>
        ${topCustomers.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Bookings</th>
                <th>Days</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${topCustomers.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.bookings}</td>
                  <td>${c.days}</td>
                  <td>$${c.revenue.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="color: var(--muted); text-align: center; padding: 20px;">No data</p>'}
      </div>
    </div>
    
    ${monthlyStats.length > 1 ? `
      <div class="panel" style="margin-top: 24px;">
        <h2>Revenue by Month</h2>
        <div style="display: flex; align-items: flex-end; gap: 8px; height: 200px; padding: 20px 0;">
          ${renderBarChart(monthlyStats)}
        </div>
      </div>
    ` : ''}
  `;
}

function renderBarChart(monthlyStats) {
  const maxRevenue = Math.max(...monthlyStats.map(m => m.revenue));
  if (maxRevenue === 0) return '<p style="color: var(--muted);">No revenue data</p>';
  
  return monthlyStats.map(m => {
    const height = (m.revenue / maxRevenue) * 150;
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 40px;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px;">$${(m.revenue / 1000).toFixed(m.revenue >= 1000 ? 1 : 0)}${m.revenue >= 1000 ? 'k' : ''}</div>
        <div style="width: 100%; max-width: 50px; height: ${height}px; background: var(--brand); border-radius: 4px 4px 0 0;"></div>
        <div style="font-size: 10px; color: var(--muted); margin-top: 4px; text-align: center;">${m.month}</div>
      </div>
    `;
  }).join('');
}

function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}