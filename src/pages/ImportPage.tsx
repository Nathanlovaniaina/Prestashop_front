import React, { useState } from 'react';
import { 
  FileUp, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  FileText,
  AlertTriangle,
  ChevronRight,
  Download
} from 'lucide-react';
import { ImportService } from '../services/ImportService';
import defaultMapping from '../config/import_mapping.json';
import '../assets/css/maintenance.css';

interface ImportError {
  line: number;
  data: string;
  message: string;
}

const ImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldSeparator, setFieldSeparator] = useState(';');
  const [multipleValueSeparator, setMultipleValueSeparator] = useState(',');
  const [selectedEntity, setSelectedEntity] = useState<'products' | 'customers' | 'addresses'>('products');
  const [strictMode, setStrictMode] = useState(true);
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const config = (defaultMapping as any).products;
    return Object.fromEntries(Object.entries(config).map(([k, v]: [string, any]) => [k, v.label]));
  });

  // Génération dynamique des configurations à partir du JSON de mapping
  const ENTITY_CONFIGS: Record<string, any> = {
    products: {
      label: 'Produits',
      fields: Object.entries((defaultMapping as any).products).map(([id, info]: [string, any]) => ({
        id,
        label: info.label,
        required: info.label.includes('*'),
        type: info.type
      }))
    },
    customers: {
      label: 'Clients',
      fields: Object.entries((defaultMapping as any).customers).map(([id, info]: [string, any]) => ({
        id,
        label: info.label,
        required: info.label.includes('*'),
        type: info.type
      }))
    },
    addresses: {
      label: 'Adresses',
      fields: Object.entries((defaultMapping as any).addresses).map(([id, info]: [string, any]) => ({
        id,
        label: info.label,
        required: info.label.includes('*'),
        type: info.type
      }))
    }
  };

  const PRESTASHOP_FIELDS = ENTITY_CONFIGS[selectedEntity].fields;

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{msg, type}, ...prev].slice(0, 50));
  };

  /**
   * Parseur CSV robuste gérant les guillemets et les virgules décimales
   */
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const separator = fieldSeparator || ';';

    // Regex pour spliter par séparateur SAUF si il est entre guillemets
    const splitLine = (line: string) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = splitLine(lines[0]);
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = splitLine(line);
      const obj: any = {};
      headers.forEach((header, i) => {
        let val = values[i] || "";
        // Nettoyage des guillemets résiduels
        val = val.replace(/^"|"$/g, '');
        // Conversion décimale (virgule -> point) si c'est un prix
        if (header.toLowerCase().includes('price') || header.toLowerCase().includes('valeur')) {
          val = val.replace(',', '.');
        }
        obj[header] = val;
      });
      return obj;
    });
  };


  // Effect pour charger et parser le fichier CSV
  React.useEffect(() => {
    if (file) {
      file.text().then(text => {
        const rows = parseCSV(text);
        setCsvData(rows);
        if (rows.length > 0) {
          const csvHeaders = Object.keys(rows[0]);
          setHeaders(csvHeaders);
          
          // Vérification de la cohérence de structure
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length > 0) {
            const separator = fieldSeparator || ';';
            const headerCount = lines[0].split(separator).length;
            
            lines.slice(1).forEach((line, index) => {
              const columnCount = line.split(separator).length;
              if (columnCount !== headerCount) {
                addLog(`Ligne ${index + 2} : Structure incorrecte (Trouvé ${columnCount} colonnes au lieu de ${headerCount}). Décalage détecté.`, 'error');
              }
            });
          }
        }
      });
    }
  }, [fieldSeparator, file]);

  // Effect pour mettre à jour le mapping quand l'entité ou les headers changent
  React.useEffect(() => {
    if (headers.length === 0) return;

    // On prend le mapping par défaut de l'entité sélectionnée
    const entityMapping = Object.fromEntries(
      Object.entries((defaultMapping as any)[selectedEntity] || {}).map(([k, v]: [string, any]) => [k, v.label])
    );
    const updatedMapping = { ...entityMapping };

    // On vérifie si les colonnes existent dans le CSV actuel (matching intelligent)
    const configs = ENTITY_CONFIGS[selectedEntity].fields;
    configs.forEach((field: any) => {
      if (!headers.includes(updatedMapping[field.id])) {
        const match = headers.find(h => {
          const hLow = h.toLowerCase().replace('*', '').trim();
          const fIdLow = field.id.toLowerCase();
          const fLabLow = field.label.toLowerCase().replace('*', '').replace('id ', '').trim();
          
          if (hLow === fIdLow || hLow === fLabLow) return true;
          
          if (fIdLow === 'id') {
            return hLow === 'id' || hLow === 'id adresse' || hLow === 'address id' || hLow === 'product id' || hLow === 'id produit';
          }

          if (fIdLow === 'email' && hLow.includes('email')) return true;
          if (fIdLow === 'lastname' && hLow.includes('last name')) return true;
          if (fIdLow === 'firstname' && hLow.includes('first name')) return true;
          if (fIdLow === 'postcode' && (hLow.includes('zipcode') || hLow.includes('code postal'))) return true;

          if (fIdLow.length > 4 && hLow.includes(fIdLow)) return true;
          
          return false;
        });
        
        updatedMapping[field.id] = match || '';
      }
    });
    setMapping(updatedMapping);
  }, [selectedEntity, headers]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setStatus('idle');
      setErrors([]);
      setSuccessCount(0);
      setProgress(0);
    }
  };


  const startImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setStatus('processing');
    setErrors([]);
    setSuccessCount(0);
    setProgress(0);
    setCurrentAction("Initialisation...");
    addLog("Démarrage de l'importation...", 'info');

    try {
      addLog("Initialisation des caches PrestaShop...", 'info');
      await ImportService.initializeCaches();
      addLog("Caches initialisés avec succès.", 'success');
      
      const text = await file.text();
      const rows = parseCSV(text);
      const total = rows.length;
      addLog(`Fichier chargé : ${total} lignes détectées.`, 'info');

      let localSuccess = 0;
      let localErrors = 0;

      for (let i = 0; i < total; i++) {
        const row = rows[i];
        
        // Appliquer le mapping
        const mappedData: any = {};
        Object.keys(mapping).forEach(key => {
          mappedData[key] = row[mapping[key]];
        });

        const lineNum = i + 2;
        const displayName = mappedData.name || mappedData.firstname || mappedData.alias || `Ligne ${lineNum}`;
        setCurrentAction(`Ligne ${lineNum} : ${displayName}`);

        // Validation du typage avant import
        const rowErrors = ImportService.validateRow(row, selectedEntity, mapping, defaultMapping);
        if (rowErrors.length > 0) {
          const errMsg = `Erreur de typage : ${rowErrors.join(' | ')}`;
          addLog(`Ligne ${lineNum} (${displayName}) : ${errMsg}`, 'error');
          setErrors(prev => [...prev, {
            line: lineNum,
            data: Object.values(row).join(','),
            message: errMsg
          }]);
          localErrors++;
          continue; 
        }

        try {
          if (selectedEntity === 'products') {
            await ImportService.importProduct(mappedData, multipleValueSeparator, strictMode);
          } else if (selectedEntity === 'customers') {
            await ImportService.importCustomer(mappedData, strictMode);
          } else if (selectedEntity === 'addresses') {
            const result = await ImportService.importAddress(mappedData, strictMode);
            if (result._rectification) {
              const { email, oldId, newId } = result._rectification;
              addLog(`Ligne ${lineNum} : ID Client rectifié pour ${email} (${oldId} ➔ ${newId})`, 'info');
            }
          }
          addLog(`Ligne ${lineNum} (${displayName}) : Succès`, 'success');
          setSuccessCount(prev => prev + 1);
          localSuccess++;
        } catch (err: any) {
          const errMsg = err.message || "Erreur d'API PrestaShop";
          addLog(`Ligne ${lineNum} (${displayName}) : ${errMsg}`, 'error');
          setErrors(prev => [...prev, {
            line: lineNum,
            data: Object.values(row).join(','),
            message: errMsg
          }]);
          localErrors++;
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      addLog(`Importation terminée. ${localSuccess} réussites, ${localErrors} échecs.`, localErrors > 0 ? 'error' : 'success');
      setStatus('completed');
    } catch (err: any) {
      addLog(`Erreur critique : ${err.message}`, 'error');
      setStatus('error');
    } finally {
      setIsImporting(false);
      setCurrentAction('');
    }
  };

  const downloadErrorReport = () => {
    const content = "Ligne,Données,Erreur\n" + 
      errors.map(e => `${e.line},"${e.data}","${e.message}"`).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erreurs_import.csv`;
    a.click();
  };

  const getValidationStatus = () => {
    const missingRequired = PRESTASHOP_FIELDS.filter((f: any) => f.required && !mapping[f.id]);
    return {
      isValid: missingRequired.length === 0,
      missing: missingRequired
    };
  };

  const validation = getValidationStatus();

  return (
    <div className="maintenance-container">
      <div className="maintenance-header">
        <FileUp size={28} color="#363a41" />
        <h1>Importation Intelligente PrestaShop</h1>
      </div>

      <div className="ps-card">
        <div className="ps-card-header">
          <div>
            <h2>Configuration de l'import</h2>
            <p>Définissez les séparateurs utilisés dans votre fichier CSV.</p>
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
            <div className="ps-badge badge-low">Étape 1</div>
          </div>
        </div>
        <div style={{padding: '20px', display: 'flex', gap: '20px', background: '#fcfdfe'}}>
          <div style={{flex: 1}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: '#6c868e', marginBottom: '8px'}}>
              <ChevronRight size={14} color="#25b9d7" /> TYPE D'ENTITÉ
            </label>
            <select 
              value={selectedEntity} 
              onChange={(e) => setSelectedEntity(e.target.value as any)}
              style={{width: '100%', padding: '10px', border: '1px solid #bbcdd2', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', backgroundColor: 'white'}}
            >
              <option value="products">Produits</option>
              <option value="customers">Clients</option>
              <option value="addresses">Adresses</option>
            </select>
          </div>
          <div style={{flex: 1}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: '#6c868e', marginBottom: '8px'}}>
              <ChevronRight size={14} color="#25b9d7" /> SÉPARATEUR DE CHAMPS
            </label>
            <input 
              type="text" 
              value={fieldSeparator} 
              onChange={(e) => setFieldSeparator(e.target.value)}
              placeholder="Ex: ;"
              style={{width: '100%', padding: '10px', border: '1px solid #bbcdd2', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center'}}
              maxLength={1}
            />
          </div>
          <div style={{flex: 1}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: '#6c868e', marginBottom: '8px'}}>
              <ChevronRight size={14} color="#25b9d7" /> MODE IDENTIFIANTS
            </label>
            <div style={{display: 'flex', gap: '10px'}}>
              <button 
                onClick={() => setStrictMode(true)}
                className={`btn-ps ${strictMode ? 'btn-ps-primary' : 'btn-ps-outline'}`}
                style={{flex: 1, fontSize: '11px', padding: '10px 5px'}}
              >
                STRICT (Garder IDs)
              </button>
              <button 
                onClick={() => setStrictMode(false)}
                className={`btn-ps ${!strictMode ? 'btn-ps-primary' : 'btn-ps-outline'}`}
                style={{flex: 1, fontSize: '11px', padding: '10px 5px'}}
              >
                AUTO (Nouveaux IDs)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ps-card">
        <div className="ps-card-header">
          <div>
            <h2>Source de données</h2>
            <p>Supporte les virgules décimales (ex: 25,9) et les guillemets.</p>
          </div>
          <div className="ps-badge badge-low">Étape 2</div>
        </div>

        <div style={{padding: '30px', textAlign: 'center'}}>
          {!file ? (
            <div 
              className="import-dropzone" 
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <FileUp size={48} color="#bbcdd2" style={{marginBottom: '15px'}} />
              <p style={{color: '#6c868e'}}>Sélectionnez votre fichier (Format: name,price,category...)</p>
              <input 
                id="csv-input" 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                style={{display: 'none'}} 
              />
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: '#f5f6f7', borderRadius: '4px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <FileText color="#25b9d7" />
                <div style={{textAlign: 'left'}}>
                  <p style={{fontWeight: 'bold', fontSize: '14px'}}>{file.name}</p>
                  <p style={{fontSize: '12px', color: '#6c868e'}}>{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button className="btn-ps btn-ps-outline" onClick={() => setFile(null)} disabled={isImporting}>Changer</button>
            </div>
          )}
        </div>

        <div className="ps-card-footer">
          <button 
            className="btn-ps btn-ps-danger" 
            disabled={!file || isImporting || !validation.isValid}
            style={{backgroundColor: validation.isValid ? '#25b9d7' : '#bbcdd2'}}
            onClick={startImport}
          >
            {isImporting ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
            <span style={{marginLeft: '8px'}}>{isImporting ? 'Importation...' : 'Lancer l\'importation'}</span>
          </button>
          {!validation.isValid && file && (
            <p style={{color: '#f44336', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px'}}>
              <AlertCircle size={14} /> Veuillez mapper tous les champs requis (*) avant de continuer.
            </p>
          )}
        </div>
      </div>

      {csvData.length > 0 && (
        <div className="ps-card" style={{marginTop: '30px', animation: 'fadeIn 0.5s ease-out'}}>
          <div className="ps-card-header">
            <div>
              <h2>Mapping des colonnes - <span style={{color: '#25b9d7'}}>{ENTITY_CONFIGS[selectedEntity].label} détecté</span></h2>
              <p>Associez les colonnes de votre CSV aux champs PrestaShop.</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
              {validation.isValid ? (
                <div className="ps-badge badge-low" style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <CheckCircle2 size={12} /> Prêt pour l'import
                </div>
              ) : (
                <div className="ps-badge badge-high" style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <AlertCircle size={12} /> {validation.missing.length} champ(s) requis manquant(s)
                </div>
              )}
              <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  className="btn-ps btn-ps-outline" 
                  style={{fontSize: '11px', padding: '5px 10px'}}
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(mapping, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'mapping_prestashop.json';
                    a.click();
                  }}
                >
                  <Download size={12} style={{marginRight: '5px'}} /> Exporter Mapping
                </button>
                <button 
                  className="btn-ps btn-ps-outline" 
                  style={{fontSize: '11px', padding: '5px 10px'}}
                  onClick={() => document.getElementById('mapping-input')?.click()}
                >
                  <FileUp size={12} style={{marginRight: '5px'}} /> Importer Mapping
                </button>
                <input 
                  id="mapping-input" 
                  type="file" 
                  accept=".json" 
                  style={{display: 'none'}} 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      e.target.files[0].text().then(text => {
                        try {
                          setMapping(JSON.parse(text));
                        } catch (err) {
                          alert("Fichier de mapping invalide");
                        }
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{padding: '20px', background: '#fcfdfe', maxHeight: '500px', overflowY: 'auto'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              {PRESTASHOP_FIELDS.map(field => {
                const isError = field.required && !mapping[field.id];
                return (
                  <div 
                    key={field.id} 
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '15px', 
                      background: isError ? '#fff5f5' : 'white', 
                      padding: '10px', 
                      borderRadius: '4px', 
                      border: isError ? '1px solid #f44336' : '1px solid #eee',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{flex: 1}}>
                      <span style={{fontSize: '12px', fontWeight: 'bold', color: isError ? '#f44336' : '#363a41'}}>
                        {field.label} {field.required && <span style={{color: '#f44336'}}>*</span>}
                      </span>
                    </div>
                    <div style={{flex: 1}}>
                      <select 
                        value={mapping[field.id] || ''} 
                        onChange={(e) => setMapping({...mapping, [field.id]: e.target.value})}
                        style={{
                          width: '100%', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          border: isError ? '1px solid #f44336' : '1px solid #bbcdd2', 
                          fontSize: '13px',
                          color: isError ? '#f44336' : 'inherit'
                        }}
                      >
                        <option value="">-- Ignorer ce champ --</option>
                        {headers.map((h, i) => (
                          <option key={i} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {csvData.length > 0 && (
        <div className="ps-card" style={{marginTop: '30px', animation: 'fadeIn 0.5s ease-out'}}>
          <div className="ps-card-header" style={{background: 'linear-gradient(135deg, #25b9d7 0%, #17a2b8 100%)', color: 'white'}}>
            <div>
              <h2 style={{color: 'white'}}>Données détectées ({csvData.length} lignes)</h2>
              <p style={{color: 'rgba(255,255,255,0.8)'}}>Vérifiez les données avant de lancer l'importation réelle.</p>
            </div>
          </div>
          <div className="terminal-logs" style={{
            height: '400px', 
            backgroundColor: '#fff', 
            color: '#333', 
            border: 'none', 
            overflow: 'auto',
            padding: '0'
          }}>
            <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
              <thead style={{position: 'sticky', top: 0, backgroundColor: '#f5f6f7', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                <tr>
                  <th style={{padding: '12px 15px', textAlign: 'center', borderBottom: '2px solid #bbcdd2', backgroundColor: '#edf1f2', width: '40px'}}>#</th>
                  {headers.map((h, i) => (
                    <th key={i} style={{padding: '12px 15px', textAlign: 'left', borderBottom: '2px solid #bbcdd2', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', color: '#6c868e'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, i) => {
                  const rowValues = Object.values(row);
                  const isMismatched = rowValues.length !== headers.length;
                  return (
                    <tr key={i} className="preview-row" style={{
                      borderBottom: '1px solid #f0f0f0', 
                      transition: 'background 0.2s',
                      backgroundColor: isMismatched ? '#fff5f5' : 'transparent'
                    }}>
                      <td style={{padding: '10px 15px', textAlign: 'center', color: isMismatched ? '#f44336' : '#bbcdd2', fontWeight: 'bold', backgroundColor: '#fafafa'}}>
                        {i + 1} {isMismatched && <AlertTriangle size={12} title="Décalage de colonnes détecté" />}
                      </td>
                      {headers.map((h, j) => {
                        // Trouver quel champ PrestaShop est mappé à cette colonne
                        const fieldId = Object.keys(mapping).find(k => mapping[k] === h);
                        const fieldInfo = fieldId ? (defaultMapping as any)[selectedEntity][fieldId] : null;
                        const value = row[h];
                        let cellError = "";

                        if (fieldInfo) {
                          if (fieldInfo.label.includes('*') && (!value || String(value).trim() === '')) {
                            cellError = "Requis";
                          } else if (value && String(value).trim() !== '') {
                            switch (fieldInfo.type) {
                              case 'number':
                                if (isNaN(Number(String(value).replace(',', '.')))) cellError = "Nombre invalide";
                                break;
                              case 'boolean':
                                if (!['0', '1', 'true', 'false'].includes(String(value).toLowerCase())) cellError = "0 ou 1 attendu";
                                break;
                              case 'email':
                                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) cellError = "Email invalide";
                                break;
                              case 'date':
                                if (isNaN(new Date(value).getTime()) && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) cellError = "Date invalide";
                                break;
                            }
                          }
                        }

                        return (
                          <td key={j} style={{
                            padding: '10px 15px', 
                            color: cellError ? '#f44336' : (isMismatched ? '#f44336' : '#444'),
                            backgroundColor: cellError ? '#fff5f5' : 'transparent',
                            position: 'relative'
                          }}>
                            {row[h]}
                            {cellError && (
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                fontSize: '8px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                padding: '2px 4px',
                                borderRadius: '2px',
                                fontWeight: 'bold'
                              }}>
                                {cellError}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(isImporting || status === 'completed') && (
        <div className="progress-section">
          <div className="progress-header">
            <div className="progress-info">
              <div>
                <span style={{fontSize: '11px', fontWeight: 'bold', color: '#6c868e'}}>PROGRÈS</span>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  {isImporting ? <Loader2 size={18} className="spin" color="#25b9d7" /> : <CheckCircle2 size={20} color="#72c279" />}
                  <span style={{fontSize: '18px', fontWeight: '300'}}>{currentAction || 'Terminé'}</span>
                </div>
              </div>
              <span style={{fontSize: '24px', color: '#bbcdd2'}}>{progress}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div style={{padding: '20px', display: 'flex', gap: '30px', borderTop: '1px solid #f0f0f0'}}>
            <div style={{textAlign: 'center', flex: 1}}>
              <p style={{fontSize: '32px', fontWeight: 'bold', color: '#72c279'}}>{successCount}</p>
              <p style={{fontSize: '12px', color: '#6c868e', textTransform: 'uppercase'}}>Réussites</p>
            </div>
            <div style={{textAlign: 'center', flex: 1}}>
              <p style={{fontSize: '32px', fontWeight: 'bold', color: '#f44336'}}>{errors.length}</p>
              <p style={{fontSize: '12px', color: '#6c868e', textTransform: 'uppercase'}}>Échecs</p>
            </div>
          </div>

          <div style={{padding: '0 20px 20px 20px'}}>
            <div style={{
              backgroundColor: '#1e2125', 
              color: '#d1d5db', 
              padding: '15px', 
              borderRadius: '4px', 
              fontFamily: 'monospace', 
              fontSize: '12px',
              maxHeight: '200px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: '4px'
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{
                  color: log.type === 'error' ? '#ff6b6b' : log.type === 'success' ? '#51cf66' : '#d1d5db',
                  borderLeft: `2px solid ${log.type === 'error' ? '#ff6b6b' : log.type === 'success' ? '#51cf66' : '#5c7cfa'}`,
                  paddingLeft: '10px'
                }}>
                  <span style={{opacity: 0.5}}>[{new Date().toLocaleTimeString()}]</span> {log.msg}
                </div>
              ))}
              <div style={{color: '#25b9d7', fontWeight: 'bold', marginBottom: '5px'}}>--- LOGS D'IMPORTATION ---</div>
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="ps-card" style={{marginTop: '30px', borderColor: '#f44336'}}>
          <div className="ps-card-header" style={{backgroundColor: '#fdf0f0'}}>
            <h2 style={{color: '#f44336', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <AlertTriangle size={18} />
              Erreurs ({errors.length})
            </h2>
            <button className="btn-ps btn-ps-outline" onClick={downloadErrorReport} style={{fontSize: '12px'}}>
              <Download size={14} style={{marginRight: '5px'}} /> Exporter
            </button>
          </div>
          <div className="terminal-logs" style={{height: '200px', backgroundColor: '#fff', color: '#333', border: 'none'}}>
            <table style={{width: '100%', fontSize: '12px'}}>
              <thead style={{position: 'sticky', top: 0, backgroundColor: '#f5f6f7'}}>
                <tr>
                  <th style={{padding: '8px', textAlign: 'left', width: '60px'}}>Ligne</th>
                  <th style={{padding: '8px', textAlign: 'left'}}>Message</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, i) => (
                  <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '8px', color: '#f44336', fontWeight: 'bold'}}>{err.line}</td>
                    <td style={{padding: '8px', color: '#666'}}>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;
