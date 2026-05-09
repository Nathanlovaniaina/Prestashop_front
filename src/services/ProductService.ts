import { ApiService } from './ApiService';
import { fetchPrestaShop } from '../api/prestashop';

// Définition des types pour plus de sécurité
export type MultilangField = string | {
  language: string | string[];
};

export interface Product {
  id: string;
  name: MultilangField;
  reference: string;
  id_category_default: string;
  price: string;
  active: string;
  id_default_image: string;
  quantity?: string;
}

export interface Category {
  id: string;
  name: MultilangField;
}

export class ProductService extends ApiService {
  static async getCategories(): Promise<Category[]> {
    const data = await this.getAll('categories', 'display=[id,name]');
    if (data?.categories?.category) {
      return Array.isArray(data.categories.category) 
        ? data.categories.category 
        : [data.categories.category];
    }
    return [];
  }

  static async getTotalCount(catId?: string): Promise<number> {
    let params = 'display=[id]';
    if (catId) params += `&filter[id_category_default]=${catId}`;
    
    const data = await this.getAll('products', params);
    if (data?.products?.product) {
      const list = Array.isArray(data.products.product) ? data.products.product : [data.products.product];
      return list.length;
    }
    return 0;
  }

  static async getProducts(page: number, itemsPerPage: number, catId?: string): Promise<Product[]> {
    const offset = (page - 1) * itemsPerPage;
    let params = `display=[id,name,reference,id_category_default,price,active,id_default_image]&limit=${offset},${itemsPerPage}`;
    if (catId) params += `&filter[id_category_default]=${catId}`;
    
    const data = await this.getAll('products', params);
    if (data?.products?.product) {
      const productList = Array.isArray(data.products.product) ? data.products.product : [data.products.product];
      
      return await Promise.all(
        productList.map(async (p: Product) => {
          try {
            const stockData = await fetchPrestaShop(`/api/stock_availables?filter[id_product]=${p.id}&display=[quantity]`);
            const quantity = stockData?.stock_availables?.stock_available?.quantity || '0';
            return { ...p, quantity };
          } catch {
            return { ...p, quantity: '0' };
          }
        })
      );
    }
    return [];
  }
}
