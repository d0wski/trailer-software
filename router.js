// router.js - Switches between different views

import { loadHomeView } from './views/home-view.js';
import { loadBookingsView } from './views/bookings-view.js';
import { loadCustomersView } from './views/customers-view.js';
import { loadReportsView } from './views/reports-view.js';
import { loadEquipmentView } from './views/equipment-view.js';
import { loadSettingsView } from './views/settings-view.js';

export async function showView(viewName) {
  const mainContent = document.querySelector('.main');
  
  mainContent.innerHTML = '';
  
  switch(viewName) {
  case 'home':
    loadHomeView();
    break;
  case 'bookings':
    loadBookingsView();
    break;
  case 'customers':
    loadCustomersView();
    break;
  case 'reports':
    loadReportsView();
    break;
  case 'equipment':
    loadEquipmentView();
    break;
  case 'settings':
    loadSettingsView();
    break;
  default:
    loadHomeView();
}
}
