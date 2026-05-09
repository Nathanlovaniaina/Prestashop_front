# Guide Complet de l'API PrestaShop Webservice

Ce document explique le fonctionnement des paramètres de l'API PrestaShop et détaille les ressources disponibles.

## 1. Paramètres de Requête (Query Parameters)

Ces paramètres peuvent être ajoutés à n'importe quelle requête `GET` sur une ressource (ex: `/api/products?param=valeur`).

| Paramètre | Description | Exemple |
| :--- | :--- | :--- |
| **`display`** | Contrôle les champs retournés. `full` retourne tout. `[id,name]` retourne uniquement l'ID et le nom. | `display=[id,name,price]` |
| **`filter[field]`** | Filtre les résultats. Supporte les valeurs exactes, les intervalles `[min|max]` ou les listes `[val1|val2]`. | `filter[id]=[1|10]` |
| **`sort`** | Trie les résultats. Format : `[field_ASC]` ou `[field_DESC]`. Séparer par des virgules pour plusieurs tris. | `sort=[price_DESC,id_ASC]` |
| **`limit`** | Gère la pagination. Un seul chiffre pour le nombre de résultats, ou `début,nombre`. | `limit=5,10` (saute 5, prend 10) |
| **`schema`** | Récupère la structure d'une ressource. `synopsis` donne les types de données, `blank` donne un XML vide. | `schema=synopsis` |
| **`output_format`** | Change le format de réponse. Valeurs : `XML` (par défaut) ou `JSON`. | `output_format=JSON` |
| **`id_shop`** | (Multi-boutique) Filtre les résultats pour une boutique spécifique. | `id_shop=1` |
| **`id_group_shop`** | (Multi-boutique) Filtre les résultats pour un groupe de boutiques. | `id_group_shop=1` |

---

## 2. Liste des Ressources (Endpoints)

### Catalogue & Produits
- **`products`** : Gère l'intégralité des produits (prix, stocks, SEO, descriptions).
- **`categories`** : Arborescence des catégories de la boutique.
- **`combinations`** : Déclinaisons de produits (ex: taille S, couleur Bleu). Relie les attributs aux produits.
- **`product_options`** : Groupes d'attributs (ex: "Taille", "Couleur").
- **`product_option_values`** : Valeurs individuelles des attributs (ex: "Bleu", "Rouge", "XL").
- **`product_features`** : Caractéristiques techniques (ex: "Matière", "Poids").
- **`product_feature_values`** : Valeurs des caractéristiques (ex: "Coton", "1.5kg").
- **`tags`** : Mots-clés associés aux produits pour la recherche interne.
- **`attachments`** : Documents joints aux produits (ex: manuel PDF).
- **`image_types`** : Définition des formats d'images (ex: home_default, large_default).
- **`images`** : Endpoint spécial pour l'upload et la récupération d'images (Produits, Catégories, etc.).

### Commandes & Ventes
- **`orders`** : L'entité principale des ventes. Contient les totaux, le client, le transporteur.
- **`order_details`** : Lignes de produits à l'intérieur d'une commande (quantité, prix unitaire).
- **`order_histories`** : Historique des changements de statut d'une commande.
- **`order_invoices`** : Factures générées pour les commandes.
- **`order_payments`** : Détails des transactions de paiement.
- **`order_slips`** : Bons de réduction et avoirs.
- **`order_states`** : Liste des statuts possibles (En attente, Livré, Annulé, etc.).
- **`order_carriers`** : Informations sur l'expédition liée à une commande.
- **`carts`** : Paniers des clients (avant qu'ils ne deviennent des commandes).
- **`cart_rules`** : Bons de réduction / Codes promo (ex: -10% avec "PROMO10").

### Clients & Communication
- **`customers`** : Base de données des clients enregistrés.
- **`addresses`** : Toutes les adresses (Clients, Fournisseurs, Fabricants).
- **`groups`** : Groupes de clients (Visiteur, Invité, Client).
- **`guests`** : Visiteurs n'ayant pas créé de compte mais ayant un panier.
- **`genders`** : Titres de civilité (M., Mme, etc.).
- **`customer_threads`** : Fils de discussion du service client (SAV).
- **`customer_messages`** : Messages individuels dans les fils de discussion SAV.
- **`contacts`** : Adresses emails de contact affichées sur le site.

### Stock & Logistique
- **`stock_availables`** : Gère les quantités de produits disponibles à la vente. C'est ici qu'on met à jour les stocks.
- **`stocks`** : Inventaire physique réel (utilisé avec la gestion de stock avancée).
- **`stock_movements`** : Historique des entrées/sorties de stock.
- **`warehouses`** : Gestion des entrepôts physiques.
- **`carriers`** : Liste des transporteurs disponibles (Colissimo, DHL, etc.).
- **`deliveries`** : Frais de port par zone/tranche de poids.

### International & Config
- **`languages`** : Langues activées sur la boutique.
- **`currencies`** : Devises (Euro, Dollar, etc.) et taux de change.
- **`countries`** : Liste des pays.
- **`states`** : États ou départements (ex: pour la France ou les USA).
- **`zones`** : Zones géographiques (Europe, Amérique, etc.).
- **`taxes`** : Taux de taxes (ex: 20%).
- **`tax_rules`** : Association entre une taxe, un pays et une zone.
- **`shops`** : Liste des boutiques (en mode multi-boutique).
- **`configurations`** : Accès aux réglages de PrestaShop stockés en base de données.

---

## 3. Méthodes HTTP Supportées

- **`GET`** : Lire une ressource ou une liste.
- **`POST`** : Créer une nouvelle ressource (nécessite un XML complet).
- **`PUT`** : Mettre à jour une ressource existante (nécessite l'ID dans l'URL et le XML).
- **`DELETE`** : Supprimer une ressource par son ID.
- **`HEAD`** : Récupérer uniquement les headers (utile pour vérifier l'existence ou le nombre total).

---

## 4. Astuces Pro

1. **Obtenir le format XML pour un POST** : Faites un `GET /api/products?schema=blank`. Copiez le résultat, remplissez les champs et faites votre `POST`.
2. **Filtrage par date** : Utilisez `filter[date_add]=[2023-01-01,2023-12-31]` pour les intervalles.
3. **Erreurs** : L'API retourne des codes HTTP standard (401 Unauthorized, 404 Not Found, 400 Bad Request). En cas d'erreur 400, PrestaShop renvoie souvent un XML expliquant le champ manquant ou invalide.
