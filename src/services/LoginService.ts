import { ApiService } from './ApiService';
import bcrypt from 'bcryptjs';

export interface Employee {
  id: string;
  email: string;
  passwd?: string;
  firstname: string;
  lastname: string;
}

export class LoginService extends ApiService {
  /**
   * Tente de connecter un employé
   */
  static async login(email: string, password: string): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    try {
      // 1. Récupérer tous les employés avec email et passwd
      // Note: PrestaShop WebService doit avoir les permissions sur 'employees'
      const data = await this.getAll('employees', 'display=[id,email,passwd,firstname,lastname]');
      
      if (!data?.employees?.employee) {
        return { success: false, error: "Impossible de récupérer les employés. Vérifiez les permissions de l'API." };
      }

      const employees = Array.isArray(data.employees.employee) 
        ? data.employees.employee 
        : [data.employees.employee];

      // 2. Trouver l'employé par email
      const employee = employees.find((e: any) => e.email.toLowerCase() === email.toLowerCase());

      if (!employee) {
        return { success: false, error: "Identifiants incorrects." };
      }

      // 3. Vérifier le mot de passe avec bcrypt
      // PrestaShop stocke les mots de passe sous forme de hash bcrypt $2y$...
      // En JS, bcryptjs accepte $2y$ (PHP) et le traite comme $2a$
      const hash = employee.passwd.replace(/^\$2y\$/, '$2a$');
      const isMatch = await bcrypt.compare(password, hash);

      if (isMatch) {
        // Stocker la session dans le localStorage
        const sessionEmployee: Employee = {
          id: employee.id,
          email: employee.email,
          firstname: employee.firstname,
          lastname: employee.lastname
        };
        localStorage.setItem('ps_admin_session', JSON.stringify(sessionEmployee));
        return { success: true, employee: sessionEmployee };
      } else {
        return { success: false, error: "Identifiants incorrects." };
      }
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: "Une erreur est survenue lors de la connexion." };
    }
  }

  /**
   * Vérifie si un utilisateur est connecté
   */
  static isAuthenticated(): boolean {
    return localStorage.getItem('ps_admin_session') !== null;
  }

  /**
   * Déconnexion
   */
  static logout() {
    localStorage.removeItem('ps_admin_session');
  }

  /**
   * Récupère les infos de l'utilisateur connecté
   */
  static getCurrentUser(): Employee | null {
    const session = localStorage.getItem('ps_admin_session');
    return session ? JSON.parse(session) : null;
  }
}
