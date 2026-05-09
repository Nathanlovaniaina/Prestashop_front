# Guide d'implémentation : Import CSV Robuste pour PrestaShop

Ce document détaille la logique technique à implémenter pour créer une page d'importation de données (CSV) capable de gérer l'intégrité référentielle et les erreurs de manière fluide.

## 1. Stratégie de Validation "Fail-Fast"

Au lieu de vérifier manuellement chaque ID avant l'import, utilisez la réponse naturelle de l'API PrestaShop.

- **Mécanisme :** Enveloppez chaque appel `POST` dans un bloc `try/catch`.
- **Comportement API :** Si vous envoyez un produit avec un `id_category_default` inexistant, l'API renverra une erreur HTTP 400.
- **Reporting :** Stockez les erreurs dans un tableau d'objets pour affichage final :
  ```javascript
  const errors = [];
  // ... dans la boucle ...
  catch (err) {
    errors.push({
      line: currentLine,
      page: Math.ceil(currentLine / 100),
      data: rowData,
      message: "Erreur 400 : Catégorie parente introuvable"
    });
  }
  ```

## 2. Gestion des Dépendances (Fonction Pivot)

Pour éviter de bloquer l'import à cause d'une donnée manquante (ex: un pays), implémentez un système de **Cache & Create**.

### Logique du Cache Local
1. **Initialisation :** Avant de démarrer l'import, récupérez la liste des entités pivots existantes (Pays, Langues, Groupes).
2. **Structure du Cache :** Stockez-les sous forme de dictionnaire pour un accès instantané (O(1)) :
   ```javascript
   const countryCache = { "France": 8, "Madagascar": 110 };
   ```
3. **Flux de vérification par ligne :**
   - **SI** le pays existe dans le cache : Utilisez l'ID.
   - **SINON** :
     - Effectuez un `POST /api/countries` immédiatement.
     - Récupérez l'ID généré.
     - **Mettez à jour le cache** : `countryCache["Nouveau Pays"] = newId`.
     - Continuez l'import de la ligne actuelle.

## 3. Ordre de Priorité des Imports

Pour respecter l'intégrité de la base de données, l'import doit suivre cet ordre séquentiel :

| Priorité | Entité | Dépend de... |
| :--- | :--- | :--- |
| **1** | Pays / Langues | _Rien_ |
| **2** | Catégories | Catégorie parente |
| **3** | Clients | Groupe de clients |
| **4** | Adresses | Client + Pays |
| **5** | Produits | Catégorie + Marque |
| **6** | Commandes | Client + Adresse + Transporteur |

## 4. Recommandations UX

- **Indicateur de Progression :** Affichez une barre de progression globale et le nom de l'entité en cours de traitement.
- **Journal d'Erreurs :** Permettez à l'utilisateur de télécharger un log (JSON ou CSV) des lignes ayant échoué à la fin du processus.
- **Batch Processing :** Si le fichier est très gros (> 1000 lignes), traitez les lignes par paquets de 50 pour ne pas saturer le navigateur.

---
*Note : Assurez-vous que votre `ApiService` gère correctement les erreurs HTTP 400/500 pour extraire les messages d'erreur XML renvoyés par PrestaShop.*
