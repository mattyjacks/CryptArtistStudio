/**
 * Component Loader - Loads shared header and footer across all pages
 * This system ensures DRY (Don't Repeat Yourself) principles for navigation
 */

async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(componentPath);
    if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
    const html = await response.text();
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = html;
    }
    return true;
  } catch (error) {
    console.error(`Error loading component ${componentPath}:`, error);
    return false;
  }
}

function initializeNavigation() {
  // Get current page from URL
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Set active nav link
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const linkPage = link.getAttribute('data-page');
    const linkHref = link.getAttribute('href');
    
    // Check if this is the current page
    if (linkHref === currentPage || (currentPage === '' && linkHref === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Mobile menu toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      navLinks.style.display = isExpanded ? 'none' : 'flex';
    });
  }
  
  // Update current year in footer
  const yearSpan = document.querySelector('.current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

// Load components when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const promises = [];
  
  // Load header if placeholder exists
  if (document.getElementById('header-placeholder')) {
    promises.push(loadComponent('header-placeholder', 'components/header.html'));
  }
  
  // Load footer if placeholder exists
  if (document.getElementById('footer-placeholder')) {
    promises.push(loadComponent('footer-placeholder', 'components/footer.html'));
  }
  
  // Wait for all components to load, then initialize
  await Promise.all(promises);
  initializeNavigation();
});
