# Spécifications du Format CSV pour l'Import PrestaShop

Ce document définit les formats attendus pour chaque type de données et les résultats de validation attendus.

## 1. Format Global
- **Séparateur :** Virgule (`,`)
- **Encodage :** UTF-8
- **En-tête :** Obligatoire sur la première ligne.

## 2. Modèles de Données (Exemples)

### Produits (`produits.csv`)
| name | price | category | reference | description |
| :--- | :--- | :--- | :--- | :--- |
| T-shirt PrestaShop | 15.90 | Vêtements | TS-001 | T-shirt en coton bio |
| Mug Design | 8.50 | Maison | MUG-99 | Mug en céramique |

**Version brute :**
```csv
name,price,category,reference,description
"T-shirt PrestaShop",15.90,"Vêtements","TS-001","T-shirt en coton bio"
"Mug Design",8.50,"Maison","MUG-99","Mug en céramique"
```

### Clients (`clients.csv`)
```csv
firstname,lastname,email,passwd,id_gender
"Jean","Dupont","jean@example.com","password123",1
"Marie","Curie","marie@science.fr","radium88",2
```

### Commandes (`commandes.csv`)
```csv
customer_email,product_ref,quantity,payment_method
"jean@example.com","TS-001",2,"PayPal"
```

---

## 3. Scénario de Test de Validation (Fail-Fast)

### Entrée (CSV erroné)
```csv
name,price,category,reference,description
"Produit Valide",10.00,"Accueil","REF-OK","OK"
"Produit Invalide",20.00,"Catégorie_Inexistante","REF-ERR","Error"
```

### Résultat Attendu dans l'Interface
L'application doit traiter les lignes une par une et afficher le résultat suivant :

| Ligne | État | Message d'erreur (Log) |
| :--- | :--- | :--- |
| 2 | ✅ Succès | Produit créé avec succès. |
| 3 | ❌ Échec | Erreur 400 : La catégorie 'Catégorie_Inexistante' n'a pas pu être créée ou trouvée. |

**Comportement final :** L'import s'arrête à 50% de réussite (1/2) et affiche le journal des erreurs pour la ligne 3.
