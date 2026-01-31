/**
 * Web Component для шапки навигации
 * Автоматически определяет активную страницу
 */

class AppHeader extends HTMLElement {
  connectedCallback() {
    const baseUrl = import.meta.env.BASE_URL;
    const currentPath = window.location.pathname;
    // Удаляем trailing slash для сравнения, если это не корень
    const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath;
    const normalizedBase = baseUrl.endsWith('/') && baseUrl.length > 1 ? baseUrl.slice(0, -1) : baseUrl;
    
    const isHomePage = currentPath === baseUrl || 
                      currentPath === `${baseUrl}index.html` || 
                      normalizedPath === normalizedBase;
    
    // Применяем стили к самому элементу
    this.style.cssText = `
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: linear-gradient(135deg, #5568d3 0%, #6b46a8 100%);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    this.innerHTML = `
      <style>

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -1px;
          text-decoration: none;
          color: white;
          transition: opacity 0.2s;
        }

        .logo:hover {
          opacity: 0.8;
        }

        nav {
          display: flex;
          gap: 30px;
          align-items: center;
        }

        a {
          color: white;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: opacity 0.2s;
          position: relative;
        }

        a::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          right: 0;
          height: 2px;
          background: white;
          transform: scaleX(0);
          transition: transform 0.2s;
        }

        a:hover {
          opacity: 0.8;
        }

        a:hover::after {
          transform: scaleX(1);
        }

        a.active::after {
          transform: scaleX(1);
        }

        @media (max-width: 768px) {
          nav {
            gap: 15px;
          }

          a {
            font-size: 14px;
          }

          .logo {
            font-size: 24px;
          }
        }
      </style>
      
      <div class="header-content">
        <a href="${baseUrl}" class="logo">Tvist</a>
        <nav>
          <a href="${baseUrl}" class="${isHomePage ? 'active' : ''}">Примеры</a>
          <a href="https://github.com/VladimirIvanin/tvist" target="_blank">GitHub</a>
          <a href="../README.md">Документация</a>
        </nav>
      </div>
    `;
  }
}

// Регистрируем Web Component
customElements.define('app-header', AppHeader);

// Автоматически добавляем шапку в начало body
function insertHeader() {
  const header = document.createElement('app-header');
  document.body.insertBefore(header, document.body.firstChild);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', insertHeader);
} else {
  insertHeader();
}
