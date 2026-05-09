# Documentation Complète de l'API PrestaShop Webservice

Ce guide détaille chaque endpoint, son utilité, les paramètres GET et la structure XML pour les opérations POST/PUT.

---

## 1. Paramètres Communs (Toutes les ressources)

### GET (Consultation)
- `display=[field1,field2]` : Liste des champs à retourner (ou `full`).
- `filter[field]=[value]` : Filtrer par valeur exacte.
- `filter[field]=[min|max]` : Filtrer par intervalle (prix, dates).
- `sort=[field_ASC]` : Trier les résultats.
- `limit=X,Y` : Pagination (Offset, Nombre).
- `schema=synopsis` : Voir les types de données et contraintes.
- `schema=blank` : Obtenir un XML vide pour création.

### POST / PUT (Écriture)
- **Format** : Toujours encapsuler dans `<prestashop><resource>...</resource></prestashop>`.
- **Champs Multilingues** : Utilisent la structure `<field><language id="1">Valeur</language></field>`.

---

## 2. Référence par Endpoint

### [products] - Gestion des produits
**Utilité** : Créer et modifier les fiches produits.
**Paramètres GET spécifiques** : `price[id_customer]`, `price[id_group]`, `price[id_country]`, `price[id_currency]`.
**Structure POST complète** :
```xml
<prestashop>
  <product>
    <id_manufacturer>1</id_manufacturer>
    <id_supplier>1</id_supplier>
    <id_category_default>2</id_category_default>
    <id_tax_rules_group>1</id_tax_rules_group>
    <id_shop_default>1</id_shop_default>
    <reference>REF123</reference>
    <supplier_reference>SUP123</supplier_reference>
    <location>Aisle 1</location>
    <width>10.0</width>
    <height>10.0</height>
    <depth>10.0</depth>
    <weight>1.5</weight>
    <quantity_discount>0</quantity_discount>
    <ean13>1234567890123</ean13>
    <upc>123456789012</upc>
    <mpn>MPN123</mpn>
    <cache_is_pack>0</cache_is_pack>
    <cache_has_attachments>0</cache_has_attachments>
    <is_virtual>0</is_virtual>
    <state>1</state>
    <additional_delivery_times>0</additional_delivery_times>
    <delivery_in_stock><language id="1">En stock</language></delivery_in_stock>
    <delivery_out_stock><language id="1">Rupture</language></delivery_out_stock>
    <on_sale>0</on_sale>
    <online_only>0</online_only>
    <ecotax>0.0</ecotax>
    <minimal_quantity>1</minimal_quantity>
    <low_stock_threshold>5</low_stock_threshold>
    <low_stock_alert>0</low_stock_alert>
    <price>19.99</price>
    <wholesale_price>10.00</wholesale_price>
    <unity>piece</unity>
    <unit_price_ratio>1.0</unit_price_ratio>
    <additional_shipping_cost>0.0</additional_shipping_cost>
    <customizable>0</customizable>
    <text_fields>0</text_fields>
    <uploadable_files>0</uploadable_files>
    <active>1</active>
    <redirect_type>404</redirect_type>
    <id_type_redirected>0</id_type_redirected>
    <available_for_order>1</available_for_order>
    <available_date>0000-00-00</available_date>
    <show_condition>0</show_condition>
    <condition>new</condition>
    <show_price>1</show_price>
    <indexed>1</indexed>
    <visibility>both</visibility>
    <advanced_stock_management>0</advanced_stock_management>
    <pack_stock_type>3</pack_stock_type>
    <name><language id="1">Nom Produit</language></name>
    <description><language id="1">Description HTML</language></description>
    <description_short><language id="1">Résumé</language></description_short>
    <link_rewrite><language id="1">nom-produit</language></link_rewrite>
    <meta_description><language id="1">SEO Desc</language></meta_description>
    <meta_keywords><language id="1">SEO Keywords</language></meta_keywords>
    <meta_title><language id="1">SEO Title</language></meta_title>
    <associations>
      <categories><category><id>2</id></category></categories>
      <product_features><product_feature><id>1</id><id_feature_value>1</id_feature_value></product_feature></product_features>
      <tags><tag><id>1</id></tag></tags>
      <stock_availables><stock_available><id>1</id><id_product_attribute>0</id_product_attribute></stock_available></stock_availables>
    </associations>
  </product>
</prestashop>
```

### [categories] - Arborescence catalogue
**Utilité** : Organiser les produits.
**POST complet** :
```xml
<prestashop>
  <category>
    <id_parent>2</id_parent>
    <active>1</active>
    <is_root_category>0</is_root_category>
    <name><language id="1">Électronique</language></name>
    <link_rewrite><language id="1">electronique</language></link_rewrite>
    <description><language id="1">Description</language></description>
    <meta_title><language id="1">Titre</language></meta_title>
    <meta_description><language id="1">Desc</language></meta_description>
    <meta_keywords><language id="1">Keywords</language></meta_keywords>
  </category>
</prestashop>
```

### [customers] - Base clients
**Utilité** : Gérer les comptes utilisateurs.
**POST complet** :
```xml
<prestashop>
  <customer>
    <id_default_group>3</id_default_group>
    <id_lang>1</id_lang>
    <id_gender>1</id_gender>
    <firstname>Jean</firstname>
    <lastname>Dupont</lastname>
    <email>jean.dupont@test.com</email>
    <passwd>password123</passwd>
    <birthday>1990-01-01</birthday>
    <newsletter>1</newsletter>
    <optin>0</optin>
    <active>1</active>
    <is_guest>0</is_guest>
    <company>Ma Boite</company>
    <associations>
      <groups><group><id>3</id></group></associations>
    </customer>
</prestashop>
```

### [orders] - Commandes
**Utilité** : Enregistrer les ventes.
**Note** : Requiert souvent un `id_cart` valide au préalable.
**POST complet** :
```xml
<prestashop>
  <order>
    <id_address_delivery>1</id_address_delivery>
    <id_address_invoice>1</id_address_invoice>
    <id_cart>1</id_cart>
    <id_currency>1</id_currency>
    <id_lang>1</id_lang>
    <id_customer>1</id_customer>
    <id_carrier>1</id_carrier>
    <current_state>2</current_state>
    <module>ps_checkpayment</module>
    <payment>Chèque</payment>
    <total_paid>20.00</total_paid>
    <total_paid_real>20.00</total_paid_real>
    <total_products>16.67</total_products>
    <total_products_wt>20.00</total_products_wt>
    <total_shipping>0.00</total_shipping>
    <total_discounts>0.00</total_discounts>
    <valid>1</valid>
    <associations>
      <order_rows>
        <order_row>
          <product_id>1</product_id>
          <product_attribute_id>0</product_attribute_id>
          <product_quantity>1</product_quantity>
          <product_name>Produit Test</product_name>
          <product_reference>REF1</product_reference>
          <product_price>16.67</product_price>
          <unit_price_tax_incl>20.00</unit_price_tax_incl>
          <unit_price_tax_excl>16.67</unit_price_tax_excl>
        </order_row>
      </order_rows>
    </associations>
  </order>
</prestashop>
```

### [addresses] - Carnet d'adresses
**Utilité** : Adresses de livraison/facturation.
**POST complet** :
```xml
<prestashop>
  <address>
    <id_customer>1</id_customer>
    <id_country>8</id_country>
    <id_state>0</id_state>
    <alias>Maison</alias>
    <lastname>Dupont</lastname>
    <firstname>Jean</firstname>
    <address1>10 Rue de la Paix</address1>
    <address2>Appt 5</address2>
    <postcode>75001</postcode>
    <city>Paris</city>
    <phone>0123456789</phone>
    <phone_mobile>0612345678</phone_mobile>
    <company>Test Corp</company>
  </address>
</prestashop>
```

### [stock_availables] - Gestion des stocks
**Utilité** : Mettre à jour les quantités en vente.
**Note** : Utilisez `PUT` pour modifier la `quantity`.
**PUT complet** :
```xml
<prestashop>
  <stock_available>
    <id>1</id>
    <id_product>1</id_product>
    <id_product_attribute>0</id_product_attribute>
    <quantity>50</quantity>
    <id_shop>1</id_shop>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>
```

### [combinations] - Déclinaisons
**Utilité** : Variantes d'un produit (Taille/Couleur).
**POST complet** :
```xml
<prestashop>
  <combination>
    <id_product>1</id_product>
    <reference>COMB1</reference>
    <ean13>1234567890123</ean13>
    <price>5.00</price>
    <weight>0.2</weight>
    <quantity>10</quantity>
    <associations>
      <product_option_values>
        <product_option_value><id>1</id></product_option_value>
      </product_option_values>
    </associations>
  </combination>
</prestashop>
```

### [cart_rules] - Bons de réduction
**Utilité** : Codes promos et remises automatiques.
**POST complet** :
```xml
<prestashop>
  <cart_rule>
    <name><language id="1">Réduction 10%</language></name>
    <description>Promo été</description>
    <code>SUMMER10</code>
    <priority>1</priority>
    <partial_use>1</partial_use>
    <active>1</active>
    <date_from>2024-01-01 00:00:00</date_from>
    <date_to>2024-12-31 23:59:59</date_to>
    <reduction_percent>10.00</reduction_percent>
    <id_customer>0</id_customer>
  </cart_rule>
</prestashop>
```

---

## 3. Autres Ressources Importantes (Résumé)

| Endpoint | Utilité | Champs Clés |
| :--- | :--- | :--- |
| **`carriers`** | Transporteurs | `name`, `active`, `is_free`, `shipping_method` |
| **`languages`** | Langues | `name`, `iso_code`, `language_code`, `active` |
| **`currencies`** | Devises | `name`, `iso_code`, `conversion_rate`, `active` |
| **`countries`** | Pays | `name` (multilang), `iso_code`, `id_zone`, `active` |
| **`states`** | États/Dép. | `name`, `iso_code`, `id_country`, `active` |
| **`taxes`** | Taux TVA | `name` (multilang), `rate`, `active` |
| **`manufacturers`** | Marques | `name`, `active`, `description` |
| **`suppliers`** | Fournisseurs | `name`, `active`, `description` |
| **`images`** | Photos | Gestion via binaire (Multipart/form-data) |

---

## 4. Test Complet de tous les paramètres (Exemple Produit)

Pour tester tous les paramètres GET sur l'endpoint `/api/products` :
`GET {{baseUrl}}/api/products?display=full&filter[price]=[10|100]&filter[active]=1&sort=[id_DESC]&limit=0,5&output_format=JSON`

*Explication :*
1. `display=full` : Récupère tous les champs.
2. `filter[price]=[10|100]` : Prix entre 10€ et 100€.
3. `filter[active]=1` : Uniquement les produits actifs.
4. `sort=[id_DESC]` : Les plus récents en premier.
5. `limit=0,5` : Les 5 premiers résultats.
6. `output_format=JSON` : Réponse au format JSON.
