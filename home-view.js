// home-view.js - Home screen

export async function loadHomeView() {
  const main = document.querySelector('.main');

  main.innerHTML = `
    <div class="card">
      <h1>Dashboard</h1>
      <p style="color: var(--muted);">Dashboard coming soon...</p>
    </div>
  `;
}