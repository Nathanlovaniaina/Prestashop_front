import { fetchPrestaShop } from '../api/prestashop';

export class ApiService {
  protected static async getIds(endpoint: string): Promise<string[]> {
    const data = await fetchPrestaShop(`/api/${endpoint}?display=[id]`);
    const root = data?.[endpoint];
    if (!root) return [];

    const firstKey = Object.keys(root)[0];
    const items = root[firstKey];
    if (!items) return [];

    const idList = Array.isArray(items) ? items : [items];
    
    return idList
      .map((item: any) => {
        if (typeof item.id === 'string') return item.id;
        if (typeof item.id === 'object' && item.id !== null) return item.id['#text'] || item.id;
        return item.id;
      })
      .filter((id) => {
        if (!id) return false;
        const strId = String(id);

        // --- SÉCURITÉ CRITIQUE PRESTASHOP ---
        // Ne jamais supprimer ces éléments pour éviter de casser le back-office ou le front
        
        // 1. Catégories : ID 1 (Root) et ID 2 (Accueil)
        if (endpoint === 'categories' && (strId === '1' || strId === '2')) return false;

        // 2. Langues : Ne pas supprimer la langue par défaut (souvent ID 1)
        if (endpoint === 'languages' && strId === '1') return false;

        // 3. Devises : Ne pas supprimer la devise par défaut (souvent ID 1)
        if (endpoint === 'currencies' && strId === '1') return false;

        // 4. Groupes de clients : Visiteur (1), Invité (2), Client (3)
        if (endpoint === 'groups' && (strId === '1' || strId === '2' || strId === '3')) return false;

        return true;
      });
  }

  protected static async deleteResource(endpoint: string, id: string): Promise<boolean> {
    return await fetchPrestaShop(`/api/${endpoint}/${id}`, { method: 'DELETE' });
  }

  protected static async getAll(endpoint: string, params: string = ''): Promise<any> {
    return await fetchPrestaShop(`/api/${endpoint}${params ? '?' + params : ''}`);
  }
}
