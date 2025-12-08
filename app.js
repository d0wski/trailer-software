// app.js - Main application entry point

import { showView } from './router.js';

// Navigation - switch views
const nav = document.querySelector('.nav');
nav.addEventListener('click', (e) => {
  e.preventDefault();
  const link = e.target.closest('a');
  if (!link) return;

  // Remove active from all links
  nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
  // Add active to clicked link
  link.classList.add('active');

  // Show the right view based on data-view attribute
  const viewName = link.dataset.view;
  showView(viewName);
});

// Modal helpers
window.openModal = function(content) {
  const overlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');
  modalContent.innerHTML = content;
  overlay.classList.add('active');
};

window.closeModal = function() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('active');
};

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') {
    closeModal();
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Logout button (placeholder for now)
document.getElementById('logoutBtn').addEventListener('click', () => {
  alert('Logout functionality would go here');
});

// Load home view by default
showView('home');
