import { ApiService } from './ApiService';

export class MaintenanceService extends ApiService {
  /**
   * Récupère tous les IDs pour un endpoint donné
   */
  static async fetchResourceIds(endpoint: string): Promise<string[]> {
    return await this.getIds(endpoint);
  }

  /**
   * Supprime une ressource par son ID
   */
  static async deleteResourceById(endpoint: string, id: string): Promise<boolean> {
    return await this.deleteResource(endpoint, id);
  }

  /**
   * Méthode utilitaire pour vider complètement un endpoint
   */
  static async clearEndpoint(endpoint: string, onProgress?: (current: number, total: number) => void): Promise<void> {
    const ids = await this.getIds(endpoint);
    if (ids.length === 0) return;

    for (let i = 0; i < ids.length; i++) {
      await this.deleteResource(endpoint, ids[i]);
      if (onProgress) onProgress(i + 1, ids.length);
    }
  }
}
