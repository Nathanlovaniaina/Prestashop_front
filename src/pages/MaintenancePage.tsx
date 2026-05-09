import React, { useState } from 'react';
import { 
  Settings, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import { MaintenanceService } from '../services/MaintenanceService';
import '../assets/css/maintenance.css';

interface ModuleConfig {
  id: string;
  label: string;
  description: string;
  details: string;
  priority: number;
  endpoints: string[];
  risk: 'Faible' | 'Moyen' | 'Élevé';
}

const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: 'orders',
    label: 'Ventes & Commandes',
    description: 'Supprime toutes les transactions.',
    details: 'Inclus : Commandes, Paniers, Factures et Historiques.',
    priority: 1,
    endpoints: ['orders', 'carts', 'order_histories', 'order_details', 'order_invoices', 'order_slip'],
    risk: 'Faible'
  },
  {
    id: 'customers',
    label: 'Comptes Clients',
    description: 'Supprime les comptes et adresses.',
    details: 'Inclus : Clients, Adresses, Messages SAV. (Note: Les groupes par défaut 1, 2, 3 sont protégés).',
    priority: 2,
    endpoints: ['customers', 'addresses', 'customer_threads', 'customer_messages'],
    risk: 'Moyen'
  },
  {
    id: 'catalog',
    label: 'Catalogue (Produits & Stocks)',
    description: 'Réinitialise les fiches produits et stocks.',
    details: 'Inclus : Produits, Stocks, Déclinaisons, Attributs, Caractéristiques.',
    priority: 3,
    endpoints: ['products', 'combinations', 'product_option_values', 'product_options', 'product_features', 'product_feature_values'],
    risk: 'Élevé'
  },
  {
    id: 'categories',
    label: 'Catégories & Marques',
    description: 'Supprime l\'arborescence et les fabricants.',
    details: 'Inclus : Catégories (IDs 1 et 2 protégés), Marques, Fournisseurs.',
    priority: 4,
    endpoints: ['categories', 'manufacturers', 'suppliers'],
    risk: 'Élevé'
  }
];

const MaintenancePage: React.FC = () => {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [currentAction, setCurrentAction] = useState('');

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{msg, type}, ...prev].slice(0, 50));
  };

  const handleToggleModule = (id: string) => {
    setSelectedModules(prev => {
      let next = [...prev];
      if (next.includes(id)) {
        next = next.filter(m => m !== id);
      } else {
        next.push(id);
        // Dépendances : Catalogue -> Ventes
        if ((id === 'catalog' || id === 'categories') && !next.includes('orders')) {
          next.push('orders');
          addLog(`La suppression du ${id === 'catalog' ? 'Catalogue' : 'Catégories'} nécessite de vider les Ventes.`, 'info');
        }
        // Dépendances : Catégories -> Catalogue
        if (id === 'categories' && !next.includes('catalog')) {
          next.push('catalog');
          addLog("La suppression des Catégories nécessite de vider le Catalogue Produit.", 'info');
        }
      }
      return next;
    });
  };

  const startReset = async () => {
    setIsConfirmModalOpen(false);
    setIsDeleting(true);
    setProgress(0);
    setLogs([]);
    addLog("Démarrage du processus de nettoyage...", 'info');

    try {
      const modulesToProcess = MODULES_CONFIG
        .filter(m => selectedModules.includes(m.id))
        .sort((a, b) => a.priority - b.priority);

      const totalSteps = modulesToProcess.reduce((acc, m) => acc + m.endpoints.length, 0);
      let completedSteps = 0;

      for (const module of modulesToProcess) {
        addLog(`Traitement : ${module.label}`, 'info');
        setCurrentAction(module.label);

        for (const endpoint of module.endpoints) {
          addLog(`Analyse de ${endpoint}...`, 'info');
          
          try {
            const ids = await MaintenanceService.fetchResourceIds(endpoint);

            if (ids.length === 0) {
              addLog(`Rien à supprimer pour ${endpoint}.`, 'info');
            } else {
              addLog(`${ids.length} éléments à supprimer dans ${endpoint}.`, 'info');
              let successCount = 0;
              let failCount = 0;

              for (const id of ids) {
                try {
                  const ok = await MaintenanceService.deleteResourceById(endpoint, id);
                  if (ok) successCount++;
                  else failCount++;
                } catch (e) {
                  failCount++;
                }
              }

              if (failCount > 0) {
                addLog(`${endpoint} : ${successCount} supprimés, ${failCount} échecs (contraintes d'intégrité).`, 'success');
              } else {
                addLog(`Succès: ${endpoint} est vide.`, 'success');
              }
            }
          } catch (err) {
            addLog(`Erreur lors du nettoyage de ${endpoint}.`, 'error');
          }

          completedSteps++;
          setProgress(Math.round((completedSteps / totalSteps) * 100));
        }
      }

      addLog("Maintenance terminée avec succès !", 'success');
      setProgress(100);
    } catch (error) {
      addLog("Erreur fatale durant le processus.", 'error');
    } finally {
      setIsDeleting(false);
      setCurrentAction('');
    }
  };

  return (
    <div className="maintenance-container">
      <div className="maintenance-header">
        <Settings size={28} color="#363a41" />
        <h1>Maintenance & Réinitialisation</h1>
      </div>

      <div className="ps-card">
        <div className="ps-card-header">
          <div>
            <h2>Options de nettoyage</h2>
            <p>Nettoyage complet de la base de données par modules.</p>
          </div>
          <ShieldAlert color="#ff9a00" size={24} />
        </div>

        <div className="modules-list">
          {MODULES_CONFIG.map((module) => (
            <div key={module.id} className="module-row">
              <div className="module-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  id={`module-${module.id}`}
                  checked={selectedModules.includes(module.id)}
                  onChange={() => handleToggleModule(module.id)}
                />
              </div>
              <div className="module-content">
                <label htmlFor={`module-${module.id}`} className="module-label">
                  {module.label}
                </label>
                <p className="module-desc">{module.description}</p>
                
                <div className="module-meta">
                  <span className={`ps-badge ${
                    module.risk === 'Élevé' ? 'badge-high' : 
                    module.risk === 'Moyen' ? 'badge-medium' : 
                    'badge-low'
                  }`}>
                    Risque {module.risk}
                  </span>
                  
                  <div className="ps-tooltip-trigger">
                    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                        <Info size={14} />
                        <span>Détails</span>
                    </div>
                    <div className="ps-tooltip-content">
                      {module.details}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ps-card-footer">
          <button onClick={() => setSelectedModules([])} className="btn-ps btn-ps-outline">Tout décocher</button>
          <button 
            disabled={selectedModules.length === 0 || isDeleting}
            onClick={() => setIsConfirmModalOpen(true)}
            className="btn-ps btn-ps-danger"
          >
            <Trash2 size={16} style={{marginRight: '8px', verticalAlign: 'middle'}} />
            Lancer le nettoyage
          </button>
        </div>
      </div>

      {(isDeleting || progress > 0) && (
        <div className="progress-section">
          <div className="progress-header">
            <div className="progress-info">
              <div>
                <span style={{fontSize: '11px', fontWeight: 'bold', color: '#6c868e'}}>PROGRÈS GLOBAL</span>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  {progress < 100 ? <RefreshCw size={18} className="spin" color="#25b9d7" /> : <CheckCircle size={20} color="#72c279" />}
                  <span style={{fontSize: '18px', fontWeight: '300'}}>{progress < 100 ? currentAction : 'Nettoyage terminé'}</span>
                </div>
              </div>
              <span style={{fontSize: '24px', color: '#bbcdd2'}}>{progress}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="terminal-logs">
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type === 'error' ? 'log-error' : log.type === 'success' ? 'log-success' : ''}`}>
                <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                {log.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="ps-modal-overlay">
          <div className="ps-modal">
            <div className="ps-modal-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <AlertTriangle size={20} />
                <span style={{fontWeight: 'bold'}}>Confirmation de suppression</span>
              </div>
              <X size={20} style={{cursor: 'pointer'}} onClick={() => setIsConfirmModalOpen(false)} />
            </div>
            <div className="ps-modal-body">
              <p style={{fontSize: '14px', color: '#6c868e', marginBottom: '20px'}}>
                Attention, vous allez vider les données suivantes de votre boutique. Cette opération est irréversible.
              </p>
              
              <div style={{background: '#f5f6f7', padding: '15px', borderRadius: '3px', marginBottom: '20px'}}>
                <p style={{fontSize: '11px', fontWeight: 'bold', color: '#6c868e', textTransform: 'uppercase', marginBottom: '8px'}}>Modules sélectionnés :</p>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                  {selectedModules.map(m => (
                    <span key={m} style={{background: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '12px', border: '1px solid #bbcdd2'}}>
                      {MODULES_CONFIG.find(mc => mc.id === m)?.label}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '30px'}}>
                <button onClick={() => setIsConfirmModalOpen(false)} className="btn-ps btn-ps-outline" style={{flex: 1}}>Annuler</button>
                <button 
                  onClick={startReset} 
                  className="btn-ps btn-ps-danger" 
                  style={{flex: 2}}
                >
                  Confirmer et vider la base
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
