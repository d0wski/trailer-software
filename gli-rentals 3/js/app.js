// app.js - Main application entry point

import { supabase } from './supabase.js';
import { showView } from './router.js';

// Check auth state on load
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    showApp(session.user);
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
}

function showApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'grid';
  document.getElementById('userEmail').textContent = user.email;
  showView('home');
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  errorDiv.style.display = 'none';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  } else {
    showApp(data.user);
  }
});

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

// Navigation - switch views
const nav = document.querySelector('.nav');
nav.addEventListener('click', (e) => {
  e.preventDefault();
  const link = e.target.closest('a');
  if (!link) return;

  nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
  link.classList.add('active');

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

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Password toggle
document.getElementById('passwordToggle').addEventListener('click', function() {
  const passwordInput = document.getElementById('loginPassword');
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  this.textContent = isPassword ? 'Hide' : 'Show';
});

// Initialize
init();