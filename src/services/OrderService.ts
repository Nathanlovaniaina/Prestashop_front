import { ApiService } from './ApiService';

export class OrderService extends ApiService {
  static async getOrders() {
    return await this.getAll('orders', 'display=full');
  }

  static async deleteOrder(id: string) {
    return await this.deleteResource('orders', id);
  }
}
