import { ApiService } from './ApiService';
import { fetchPrestaShop, PRESTASHOP_CONFIG } from '../api/prestashop';

export class ImportService extends ApiService {
  private static cache: {
    countries: Record<string, string>;
    categories: Record<string, string>;
    languages: Record<string, string>;
    customers: Record<string, string>;
    existingIds: Record<string, Set<string>>;
  } = {
    countries: {},
    categories: {},
    languages: {},
    customers: {},
    existingIds: {
      products: new Set(),
      customers: new Set(),
      addresses: new Set(),
    }
  };

  /**
   * Initialise les caches pour éviter les requêtes inutiles
   */
  static async initializeCaches() {
    console.log("Initialisation des caches d'import...");
    
    try {
      // Cache Pays
      const countries = await this.getAll('countries', 'display=[id,name]');
      if (countries?.countries?.country) {
        const list = Array.isArray(countries.countries.country) ? countries.countries.country : [countries.countries.country];
        list.forEach((c: any) => {
          const name = typeof c.name === 'object' ? c.name['#text'] || c.name.language : c.name;
          this.cache.countries[String(name).toLowerCase()] = c.id;
        });
      }

      // Cache Catégories
      const categories = await this.getAll('categories', 'display=[id,name]');
      if (categories?.categories?.category) {
        const list = Array.isArray(categories.categories.category) ? categories.categories.category : [categories.categories.category];
        list.forEach((c: any) => {
          const name = typeof c.name === 'object' ? c.name['#text'] || c.name.language : c.name;
          this.cache.categories[String(name).toLowerCase()] = c.id;
        });
      }

      // Cache Clients (par email pour le lien avec les adresses)
      const customers = await this.getAll('customers', 'display=[id,email]');
      if (customers?.customers?.customer) {
        const list = Array.isArray(customers.customers.customer) ? customers.customers.customer : [customers.customers.customer];
        list.forEach((c: any) => {
          this.cache.customers[String(c.email).toLowerCase()] = c.id;
          this.cache.existingIds.customers.add(String(c.id));
        });
      }

      // Cache IDs existants pour les produits
      const products = await this.getAll('products', 'display=[id]');
      if (products?.products?.product) {
        const list = Array.isArray(products.products.product) ? products.products.product : [products.products.product];
        list.forEach((p: any) => this.cache.existingIds.products.add(String(p.id)));
      }

      // Cache IDs existants pour les adresses
      const addresses = await this.getAll('addresses', 'display=[id]');
      if (addresses?.addresses?.address) {
        const list = Array.isArray(addresses.addresses.address) ? addresses.addresses.address : [addresses.addresses.address];
        list.forEach((a: any) => this.cache.existingIds.addresses.add(String(a.id)));
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation des caches:", error);
    }
  }

  /**
   * Helper pour construire les champs multilingues
   */
  private static buildLanguageField(value: any): string {
    if (value === undefined || value === null) return '';
    return `<language id="1"><![CDATA[${value}]]></language>`;
  }

  /**
   * Fonction Pivot : Récupère l'ID ou crée l'entité si elle manque
   */
  static async getOrCreateCountry(countryName: string): Promise<string> {
    const key = countryName.toLowerCase();
    if (this.cache.countries[key]) return this.cache.countries[key];

    console.log(`Pays '${countryName}' non trouvé, création...`);
    const xml = `
      <prestashop>
        <country>
          <id_zone>1</id_zone>
          <id_currency>1</id_currency>
          <active>1</active>
          <name>${this.buildLanguageField(countryName)}</name>
          <iso_code>XX</iso_code>
          <contains_states>0</contains_states>
          <need_identification_number>0</need_identification_number>
          <display_tax_label>0</display_tax_label>
          <need_zip_code>0</need_zip_code>
        </country>
      </prestashop>`;

    try {
      const result = await fetchPrestaShop('/api/countries', {
        method: 'POST',
        body: xml
      });
      const newId = result.country.id;
      this.cache.countries[key] = newId;
      return newId;
    } catch (e) {
      console.error(`Échec de création du pays ${countryName}`);
      return "1"; // Fallback vers ID par défaut
    }
  }

  /**
   * Import d'un produit complet
   */
  static async importProduct(data: any, multipleValueSeparator: string = ',', strictMode: boolean = true): Promise<any> {
    // Gestion des catégories
    const categoryNames = String(data.categories || data.category || 'Accueil').split(multipleValueSeparator);
    const categoryIds = await Promise.all(categoryNames.map(name => this.getOrCreateCategory(name.trim())));
    const defaultCategoryId = categoryIds[0] || "2";

    // Vérifier si on doit faire un PUT (update) ou un POST (create) via le cache local (O(1))
    let method = 'POST';
    let url = '/api/products';
    const hasId = strictMode && data.id;

    if (hasId && this.cache.existingIds.products.has(String(data.id))) {
      method = 'PUT';
      url = `/api/products/${data.id}`;
    }

    const xml = `
      <prestashop>
        <product>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <id_category_default>${defaultCategoryId}</id_category_default>
          <id_manufacturer>${data.id_manufacturer || 0}</id_manufacturer>
          <id_supplier>${data.id_supplier || 0}</id_supplier>
          <active>${data.active ?? 1}</active>
          <state>1</state>
          <price>${data.price_tax_excl || data.price || 0}</price>
          <wholesale_price>${data.wholesale_price || 0}</wholesale_price>
          <reference>${data.reference || ''}</reference>
          <ean13>${data.ean13 || ''}</ean13>
          <upc>${data.upc || ''}</upc>
          <on_sale>${data.on_sale || 0}</on_sale>
          <online_only>${data.online_only || 0}</online_only>
          <ecotax>${data.ecotax || 0}</ecotax>
          <minimal_quantity>${data.minimal_quantity || 1}</minimal_quantity>
          <low_stock_level>${data.low_stock_level || 0}</low_stock_level>
          <low_stock_alert>${data.low_stock_alert || 0}</low_stock_alert>
          <visibility>${data.visibility || 'both'}</visibility>
          <additional_shipping_cost>${data.additional_shipping_cost || 0}</additional_shipping_cost>
          <unity>${data.unity || ''}</unity>
          <unit_price>${data.unit_price || 0}</unit_price>
          <condition>${data.condition || 'new'}</condition>
          <show_price>${data.show_price ?? 1}</show_price>
          <available_for_order>${data.available_for_order ?? 1}</available_for_order>
          <available_date>${data.available_date || '0000-00-00'}</available_date>
          <width>${data.width || 0}</width>
          <height>${data.height || 0}</height>
          <depth>${data.depth || 0}</depth>
          <weight>${data.weight || 0}</weight>
          
          <name>${this.buildLanguageField(data.name)}</name>
          <description>${this.buildLanguageField(data.description || '')}</description>
          <description_short>${this.buildLanguageField(data.summary || '')}</description_short>
          <link_rewrite>${this.buildLanguageField(data.link_rewrite || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))}</link_rewrite>
          <meta_title>${this.buildLanguageField(data.meta_title || '')}</meta_title>
          <meta_description>${this.buildLanguageField(data.meta_description || '')}</meta_description>
          <meta_keywords>${this.buildLanguageField(data.meta_keywords || '')}</meta_keywords>
          <available_now>${this.buildLanguageField(data.available_now || 'En stock')}</available_now>
          <available_later>${this.buildLanguageField(data.available_later || 'En cours de réapprovisionnement')}</available_later>

          <associations>
            <categories>
              ${categoryIds.map(id => `<category><id>${id}</id></category>`).join('')}
            </categories>
          </associations>
        </product>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    const productId = result.product.id;

    // Mise à jour de la quantité (Nécessite une requête séparée sur stock_availables)
    if (data.quantity !== undefined && data.quantity !== null) {
      await this.updateProductQuantity(productId, data.quantity);
    }

    return result;
  }

  /**
   * Met à jour la quantité d'un produit via l'API stock_availables
   */
  private static async updateProductQuantity(productId: string, quantity: number | string) {
    try {
      // 1. Récupérer l'ID de stock correspondant au produit
      const stockData = await fetchPrestaShop(`/api/stock_availables?filter[id_product]=${productId}`);
      const stockId = stockData?.stock_availables?.stock_available?.id || 
                    (Array.isArray(stockData?.stock_availables?.stock_available) ? stockData.stock_availables.stock_available[0].id : null);

      if (stockId) {
        // 2. Récupérer l'objet complet pour le PUT (PrestaShop exige l'objet complet)
        const currentStock = await fetchPrestaShop(`/api/stock_availables/${stockId}`);
        
        const xml = `
          <prestashop>
            <stock_available>
              <id>${stockId}</id>
              <id_product>${productId}</id_product>
              <id_product_attribute>${currentStock.stock_available.id_product_attribute || 0}</id_product_attribute>
              <id_shop>${currentStock.stock_available.id_shop || 1}</id_shop>
              <id_shop_group>${currentStock.stock_available.id_shop_group || 0}</id_shop_group>
              <quantity>${quantity}</quantity>
              <depends_on_stock>0</depends_on_stock>
              <out_of_stock>2</out_of_stock>
            </stock_available>
          </prestashop>`;

        await fetchPrestaShop(`/api/stock_availables/${stockId}`, {
          method: 'PUT',
          body: xml
        });
      }
    } catch (e) {
      console.error(`Erreur lors de la mise à jour du stock pour le produit ${productId}:`, e);
    }
  }

  /**
   * Import d'un client complet
   */
  static async importCustomer(data: any, strictMode: boolean = true): Promise<any> {
    // Vérifier si on doit faire un PUT (update) ou un POST (create) via le cache local (O(1))
    let method = 'POST';
    let url = '/api/customers';
    const hasId = strictMode && data.id;

    if (hasId && this.cache.existingIds.customers.has(String(data.id))) {
      method = 'PUT';
      url = `/api/customers/${data.id}`;
    }

    const xml = `
      <prestashop>
        <customer>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <id_shop>1</id_shop>
          <id_lang>1</id_lang>
          <id_gender>${data.id_gender || 0}</id_gender>
          <id_default_group>${data.id_default_group || 3}</id_default_group>
          <firstname><![CDATA[${data.firstname}]]></firstname>
          <lastname><![CDATA[${data.lastname}]]></lastname>
          <email><![CDATA[${data.email}]]></email>
          <passwd><![CDATA[${data.passwd || 'defaultpassword'}]]></passwd>
          <birthday>${data.birthday || '0000-00-00'}</birthday>
          <newsletter>${data.newsletter || 0}</newsletter>
          <optin>${data.optin || 0}</optin>
          <active>${data.active === '0' ? 0 : 1}</active>
          <date_add>${data.date_add || new Date().toISOString().slice(0, 19).replace('T', ' ')}</date_add>
        </customer>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    // Mise à jour des caches pour la suite de l'import
    if (result?.customer?.id) {
      const newId = String(result.customer.id);
      this.cache.existingIds.customers.add(newId);
      if (data.email) {
        this.cache.customers[String(data.email).toLowerCase()] = newId;
      }
    }

    return result;
  }

  /**
   * Import d'une adresse complète
   */
  static async importAddress(data: any, strictMode: boolean = true): Promise<any> {
    const idCountry = await this.getOrCreateCountry(data.country || 'France');
    
    // Récupération de l'ID client du CSV
    let realCustomerId = String(data.id_customer || '1');
    const customerEmail = String(data.customer_email || data.email || '').toLowerCase();
    
    let rectification = null;

    // Vérification de cohérence via le cache Email -> ID
    if (customerEmail && this.cache.customers[customerEmail]) {
      const cachedId = String(this.cache.customers[customerEmail]);
      if (cachedId !== realCustomerId) {
        rectification = {
          email: customerEmail,
          oldId: realCustomerId,
          newId: cachedId
        };
        realCustomerId = cachedId;
      }
    }

    // Selon la demande : Toujours utiliser POST pour les adresses
    const method = 'POST';
    const url = '/api/addresses';

    const xml = `
      <prestashop>
        <address>
          <id_customer>${realCustomerId}</id_customer>
          <id_country>${idCountry}</id_country>
          <id_state>${data.id_state || 0}</id_state>
          <id_shop>1</id_shop>
          <id_lang>1</id_lang>
          <alias><![CDATA[${data.alias || 'Mon adresse'}]]></alias>
          <company><![CDATA[${data.company || ''}]]></company>
          <firstname><![CDATA[${data.firstname}]]></firstname>
          <lastname><![CDATA[${data.lastname}]]></lastname>
          <address1><![CDATA[${data.address1}]]></address1>
          <address2><![CDATA[${data.address2 || ''}]]></address2>
          <city><![CDATA[${data.city}]]></city>
          <postcode><![CDATA[${data.postcode}]]></postcode>
          <other><![CDATA[${data.other || ''}]]></other>
          <phone><![CDATA[${data.phone || ''}]]></phone>
          <phone_mobile><![CDATA[${data.phone_mobile || ''}]]></phone_mobile>
          <vat_number><![CDATA[${data.vat_number || ''}]]></vat_number>
          <dni><![CDATA[${data.dni || ''}]]></dni>
        </address>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    // Mise à jour du cache d'IDs pour éviter les doubles créations
    if (result?.address?.id) {
      this.cache.existingIds.addresses.add(String(result.address.id));
    }

    // Retourner le résultat avec les infos de rectification pour le log
    return {
      ...result,
      _rectification: rectification
    };
  }

  /**
   * Valide les données d'une ligne selon le typage défini
   */
  static validateRow(data: any, entity: string, mapping: any, fullMappingConfig: any): string[] {
    const errors: string[] = [];
    const entityConfig = fullMappingConfig[entity];

    if (!entityConfig) return ["Configuration d'entité introuvable"];

    Object.keys(entityConfig).forEach(fieldId => {
      const fieldInfo = entityConfig[fieldId];
      const csvColumnName = mapping[fieldId];
      const value = data[csvColumnName];

      // Vérification des champs requis
      if (fieldInfo.label.includes('*') && (!value || String(value).trim() === '')) {
        errors.push(`Le champ '${fieldInfo.label}' est requis.`);
        return;
      }

      if (!value || String(value).trim() === '') return;

      // Vérification du typage
      switch (fieldInfo.type) {
        case 'number':
          if (isNaN(Number(String(value).replace(',', '.')))) {
            errors.push(`'${fieldInfo.label}' doit être un nombre (reçu: ${value}).`);
          }
          break;
        case 'boolean':
          if (!['0', '1', 'true', 'false'].includes(String(value).toLowerCase())) {
            errors.push(`'${fieldInfo.label}' doit être 0 ou 1.`);
          }
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            errors.push(`'${fieldInfo.label}' doit être un email valide.`);
          }
          break;
        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime()) && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
            errors.push(`'${fieldInfo.label}' doit être une date valide (AAAA-MM-JJ).`);
          }
          break;
      }
    });

    return errors;
  }

  /**
   * Crée une catégorie si elle n'existe pas
   */
  private static async getOrCreateCategory(name: string): Promise<string> {
    const key = name.toLowerCase().trim();
    if (this.cache.categories[key]) return this.cache.categories[key];

    console.log(`Catégorie '${name}' non trouvée, création...`);
    const xml = `
      <prestashop>
        <category>
          <id_parent>2</id_parent>
          <active>1</active>
          <name>${this.buildLanguageField(name)}</name>
          <link_rewrite>${this.buildLanguageField(name.toLowerCase().replace(/[^a-z0-9]/g, '-'))}</link_rewrite>
        </category>
      </prestashop>`;

    try {
      const result = await fetchPrestaShop('/api/categories', {
        method: 'POST',
        body: xml
      });
      const newId = result.category.id;
      this.cache.categories[key] = newId;
      return newId;
    } catch (e) {
      console.error(`Échec de création de la catégorie ${name}`);
      return "2"; // Accueil par défaut
    }
  }
}
