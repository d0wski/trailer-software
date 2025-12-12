// settings-view.js - App settings

export async function loadSettingsView() {
  const main = document.querySelector('.main');

  main.innerHTML = `
    <div class="card">
      <h1>Settings</h1>
      <p style="color: var(--muted);">Settings coming soon...</p>
    </div>
  `;
}