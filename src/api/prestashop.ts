import { xmlToJson } from './xmlParser';

/**
 * Configuration de l'API PrestaShop
 */
export const PRESTASHOP_CONFIG = {
  // En développement, on laisse vide pour utiliser le proxy Vite
  baseUrl: '',
  wsKey: 'jrKT8HYKWnrH2oWYSbU3sF8JYPhtXfV2',
};

/**
 * Retourne les en-têtes communs
 */
export const getPrestaShopHeaders = () => {
  // Standard PrestaShop Auth: key as username, empty password
  const auth = btoa(`${PRESTASHOP_CONFIG.wsKey}:`);
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/xml',
    'Content-Type': 'text/xml',
  };
};

/**
 * Helper pour les appels fetch
 */
export const fetchPrestaShop = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${PRESTASHOP_CONFIG.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    ...options,
    headers: {
      ...getPrestaShopHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Handle DELETE or 204 No Content
  if (options.method === 'DELETE' || response.status === 204) {
    return true;
  }

  const xmlText = await response.text();
  if (!xmlText) return null;
  
  return xmlToJson(xmlText);
};
