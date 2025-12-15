// settings-view.js - App settings with bug reporting

import { supabase } from '../supabase.js';

export async function loadSettingsView() {
  const main = document.querySelector('.main');

  main.innerHTML = `
    <div class="card">
      <h1>Settings</h1>
      
      <div class="panel">
        <h2>Report a Bug</h2>
        <form id="bugReportForm">
          <div class="form-group">
            <label for="bugName">Your Name</label>
            <input type="text" id="bugName" required placeholder="Who's reporting this?">
          </div>
          <div class="form-group">
            <label for="bugDescription">What's the issue?</label>
            <textarea id="bugDescription" rows="3" required placeholder="Describe the bug or problem you encountered..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Submit Bug Report</button>
        </form>
      </div>

      <div class="panel" style="margin-top: 24px;">
        <h2>Bug Reports</h2>
        <div id="bugList">
          <p style="color: var(--text-muted); text-align: center; padding: 20px 0;">Loading...</p>
        </div>
      </div>
    </div>
  `;

  await loadBugReports();

  document.getElementById('bugReportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('bugName').value.trim();
    const description = document.getElementById('bugDescription').value.trim();
    if (!name || !description) return;
    
    const { error } = await supabase
      .from('bug_reports')
      .insert({
        description: description,
        reported_by: name
      });

    if (error) {
      console.error('Error submitting bug report:', error);
      alert('Failed to submit bug report. Please try again.');
      return;
    }

    document.getElementById('bugName').value = '';
    document.getElementById('bugDescription').value = '';
    await loadBugReports();
  });
}

async function loadBugReports() {
  const bugList = document.getElementById('bugList');
  
  const { data: bugs, error } = await supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading bug reports:', error);
    bugList.innerHTML = `<p style="color: var(--danger-text);">Failed to load bug reports.</p>`;
    return;
  }

  if (!bugs || bugs.length === 0) {
    bugList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">No bug reports yet. Things are running smoothly!</p>`;
    return;
  }

  bugList.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${bugs.map(bug => `
        <div style="padding: 16px; background: rgba(255,255,255,0.5); border-radius: 10px; border: 1px solid var(--line);">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
            <p style="margin: 0; flex: 1;">${escapeHtml(bug.description)}</p>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="pill ${bug.status === 'open' ? 'yellow' : 'green'}">${bug.status}</span>
              <button onclick="window.deleteBugReport('${bug.id}')" class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;">Delete</button>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
            ${bug.reported_by} · ${formatDate(bug.created_at)}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.deleteBugReport = function(id) {
  const modalContent = `
    <h2>Delete Bug Report</h2>
    <p>Are you sure you want to delete this bug report?</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-danger" onclick="window.confirmDeleteBug('${id}')">Delete</button>
    </div>
  `;
  openModal(modalContent);
};

window.confirmDeleteBug = async function(id) {
  const { error } = await supabase
    .from('bug_reports')
    .delete()
    .eq('id', id);

  closeModal();

  if (error) {
    console.error('Error deleting bug report:', error);
    return;
  }

  await loadBugReports();
};