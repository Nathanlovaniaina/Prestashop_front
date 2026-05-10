import { ApiService } from './ApiService';
import { fetchPrestaShop } from '../api/prestashop';

export class ImportService extends ApiService {
  private static cache: {
    countries: Record<string, string>;
    categories: Record<string, string>;
    languages: Record<string, string>;
    customers: Record<string, string>;
    productsByRef: Record<string, string>;
    suppliers: Record<string, string>;
    brands: Record<string, string>;
    states: Record<string, string>;
    existingIds: Record<string, Set<string>>;
  } = {
      countries: {},
      categories: {},
      languages: {},
      customers: {},
      productsByRef: {},
      suppliers: {},
      brands: {},
      states: {},
      existingIds: {
        products: new Set(),
        customers: new Set(),
        addresses: new Set(),
        carts: new Set(),
        orders: new Set(),
        suppliers: new Set(),
        brands: new Set(),
        stores: new Set(),
      }
    };

  /**
   * Initialise les caches pour éviter les requêtes inutiles
   */
  static async initializeCaches() {
    console.log("Initialisation des caches d'import...");

    try {
      const languages = await this.getAll('languages', 'display=[id,iso_code]');
      if (languages?.languages?.language) {
        const list = Array.isArray(languages.languages.language) ? languages.languages.language : [languages.languages.language];
        list.forEach((l: any) => this.cache.languages[String(l.iso_code).toLowerCase()] = String(l.id));
      }

      const getVal = (f: any) => {
        if (typeof f === 'string') return f;
        if (f?.language) return Array.isArray(f.language) ? (f.language[0] || "") : f.language;
        return String(f || "");
      };

      // Cache Pays
      const countries = await this.getAll('countries', 'display=[id,name]');
      if (countries?.countries?.country) {
        const list = Array.isArray(countries.countries.country) ? countries.countries.country : [countries.countries.country];
        list.forEach((c: any) => this.cache.countries[getVal(c.name).toLowerCase()] = String(c.id));
      }

      // Cache Catégories
      const categories = await this.getAll('categories', 'display=[id,name]');
      if (categories?.categories?.category) {
        const list = Array.isArray(categories.categories.category) ? categories.categories.category : [categories.categories.category];
        list.forEach((cat: any) => this.cache.categories[getVal(cat.name).toLowerCase()] = String(cat.id));
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

      // Cache IDs existants et Références pour les produits
      const products = await this.getAll('products', 'display=[id,reference]');
      if (products?.products?.product) {
        const list = Array.isArray(products.products.product) ? products.products.product : [products.products.product];
        list.forEach((p: any) => {
          this.cache.existingIds.products.add(String(p.id));
          if (p.reference) {
            this.cache.productsByRef[String(p.reference).trim().toLowerCase()] = String(p.id);
          }
        });
      }

      // Cache IDs existants pour les adresses
      const addresses = await this.getAll('addresses', 'display=[id]');
      if (addresses?.addresses?.address) {
        const list = Array.isArray(addresses.addresses.address) ? addresses.addresses.address : [addresses.addresses.address];
        list.forEach((a: any) => this.cache.existingIds.addresses.add(String(a.id)));
      }

      // Cache IDs existants pour les paniers
      const carts = await this.getAll('carts', 'display=[id]');
      if (carts?.carts?.cart) {
        const list = Array.isArray(carts.carts.cart) ? carts.carts.cart : [carts.carts.cart];
        list.forEach((c: any) => this.cache.existingIds.carts.add(String(c.id)));
      }

      // Cache IDs existants pour les commandes
      const orders = await this.getAll('orders', 'display=[id]');
      if (orders?.orders?.order) {
        const list = Array.isArray(orders.orders.order) ? orders.orders.order : [orders.orders.order];
        list.forEach((o: any) => this.cache.existingIds.orders.add(String(o.id)));
      }

      // Cache Fournisseurs
      const suppliers = await this.getAll('suppliers', 'display=[id,name]');
      if (suppliers?.suppliers?.supplier) {
        const list = Array.isArray(suppliers.suppliers.supplier) ? suppliers.suppliers.supplier : [suppliers.suppliers.supplier];
        list.forEach((s: any) => {
          this.cache.suppliers[String(s.name).toLowerCase()] = String(s.id);
          this.cache.existingIds.suppliers.add(String(s.id));
        });
      }

      // Cache Marques (Manufacturers)
      const brands = await this.getAll('manufacturers', 'display=[id,name]');
      if (brands?.manufacturers?.manufacturer) {
        const list = Array.isArray(brands.manufacturers.manufacturer) ? brands.manufacturers.manufacturer : [brands.manufacturers.manufacturer];
        list.forEach((m: any) => {
          this.cache.brands[String(m.name).toLowerCase()] = String(m.id);
          this.cache.existingIds.brands.add(String(m.id));
        });
      }

      // Cache Magasins (Stores)
      const stores = await this.getAll('stores', 'display=full');
      if (stores?.stores?.store) {
        const list = Array.isArray(stores.stores.store) ? stores.stores.store : [stores.stores.store];
        list.forEach((s: any) => this.cache.existingIds.stores.add(String(s.id)));
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

    // Gestion du fournisseur
    let idSupplier = data.id_supplier || 0;
    if (data.supplier && !idSupplier) {
      idSupplier = await this.getOrCreateSupplier(data.supplier);
    }

    // Gestion de la marque (Manufacturer)
    let idManufacturer = data.id_manufacturer || 0;
    if (data.manufacturer && !idManufacturer) {
      idManufacturer = await this.getOrCreateBrand(data.manufacturer);
    }

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
          <id_manufacturer>${idManufacturer}</id_manufacturer>
          <id_supplier>${idSupplier}</id_supplier>
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
          <advanced_stock_management>${data.advanced_stock_management || 0}</advanced_stock_management>
          <depends_on_stock>${data.depends_on_stock || 0}</depends_on_stock>
          
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

    // Mise à jour de la table product_supplier
    if (idSupplier && idSupplier !== "0") {
      await this.updateProductSupplier(productId, idSupplier, data.supplier_reference || '', data.wholesale_price || 0);
    }

    return result;
  }

  /**
   * Associe formellement un produit à un fournisseur dans ps_product_supplier
   * Inclut la référence fournisseur et le prix d'achat
   */
  private static async updateProductSupplier(productId: string, supplierId: string | number, supplierReference: string, wholesalePrice: number | string) {
    try {
      // 1. Vérifier si l'association existe déjà
      const existingData = await fetchPrestaShop(`/api/product_suppliers?filter[id_product]=${productId}&filter[id_supplier]=${supplierId}&display=[id]`);
      const existingId = existingData?.product_suppliers?.product_supplier?.id ||
        (Array.isArray(existingData?.product_suppliers?.product_supplier) ? existingData.product_suppliers.product_supplier[0].id : null);

      const xml = `
        <prestashop>
          <product_supplier>
            ${existingId ? `<id>${existingId}</id>` : ''}
            <id_product>${productId}</id_product>
            <id_product_attribute>0</id_product_attribute>
            <id_supplier>${supplierId}</id_supplier>
            <product_supplier_reference><![CDATA[${supplierReference}]]></product_supplier_reference>
            <product_supplier_price_te>${wholesalePrice || 0}</product_supplier_price_te>
            <id_currency>1</id_currency>
          </product_supplier>
        </prestashop>`;

      await fetchPrestaShop(existingId ? `/api/product_suppliers/${existingId}` : `/api/product_suppliers`, {
        method: existingId ? 'PUT' : 'POST',
        body: xml
      });
      console.log(`Fournisseur ${supplierId} associé au produit ${productId} (ref: ${supplierReference})`);

    } catch (e) {
      console.error(`Erreur lors de l'association du produit ${productId} au fournisseur ${supplierId}:`, e);
    }
  }

  /**
   * Met à jour la quantité d'un produit via l'API stock_availables
   */
  private static async updateProductQuantity(productId: string, quantity: number | string) {
    try {
      // 1. Récupérer l'ID de stock correspondant au produit
      const stockData = await fetchPrestaShop(`/api/stock_availables?filter[id_product]=${productId}&display=[id]`);
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
              <quantity>${Math.round(Number(quantity))}</quantity>
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
   * Import d'un panier (Cart)
   */
  static async importCart(data: any, multipleValueSeparator: string = ',', strictMode: boolean = true): Promise<any> {
    const customerEmail = String(data.customer_email || '').toLowerCase();
    const idCustomer = this.cache.customers[customerEmail] || "1";

    // Récupération d'une adresse valide pour ce client (Évite l'Erreur 500 "Invalid address" dans le BO)
    let validAddressId = "0";
    try {
      const addressData = await fetchPrestaShop(`/api/addresses?filter[id_customer]=${idCustomer}&display=[id]`);
      if (addressData?.addresses?.address) {
        validAddressId = Array.isArray(addressData.addresses.address) 
          ? addressData.addresses.address[0].id 
          : addressData.addresses.address.id;
      }
    } catch (e) {
      console.warn(`Impossible de récupérer une adresse pour le client ${idCustomer}`);
    }

    const productRefs = String(data.product_refs || '').split(multipleValueSeparator);
    const quantities = String(data.quantities || '').split(multipleValueSeparator);

    const cartRows = productRefs.map((ref, index) => {
      const productId = this.cache.productsByRef[ref.trim().toLowerCase()] || "1";
      const qty = quantities[index] || "1";
      return `
        <cart_row>
          <id_product>${productId}</id_product>
          <id_product_attribute>0</id_product_attribute>
          <id_address_delivery>${validAddressId}</id_address_delivery>
          <quantity>${qty}</quantity>
        </cart_row>`;
    }).join('');

    const method = (strictMode && data.id && this.cache.existingIds.carts.has(String(data.id))) ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/carts/${data.id}` : '/api/carts';

    // Récupération de la secure_key du client pour l'associer au panier
    let secureKey = data.secure_key || "";
    try {
      const customerData = await fetchPrestaShop(`/api/customers/${idCustomer}`);
      if (customerData?.customer?.secure_key) {
        secureKey = customerData.customer.secure_key;
      }
    } catch (e) {
      console.warn(`Impossible de récupérer la secure_key pour le client ${idCustomer}`);
    }

    const xml = `
      <prestashop>
        <cart>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <id_customer>${idCustomer}</id_customer>
          <id_address_delivery>${validAddressId}</id_address_delivery>
          <id_address_invoice>${validAddressId}</id_address_invoice>
          <id_currency>1</id_currency>
          <id_lang>${data.id_lang || 1}</id_lang>
          <id_carrier>${data.id_carrier || 0}</id_carrier>
          <secure_key>${secureKey}</secure_key>
          <associations>
            <cart_rows>
              ${cartRows}
            </cart_rows>
          </associations>
        </cart>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    if (result?.cart?.id) {
      this.cache.existingIds.carts.add(String(result.cart.id));
    }

    return result;
  }

  /**
   * Import d'une commande (Order)
   */
  static async importOrder(data: any, strictMode: boolean = true): Promise<any> {
    const method = (strictMode && data.id && this.cache.existingIds.orders.has(String(data.id))) ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/orders/${data.id}` : '/api/orders';

    // Formatage de la date pour correspondre au format MySQL (YYYY-MM-DD HH:MM:SS) attendu par PrestaShop
    let formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (data.order_date) {
      let d = String(data.order_date).trim();
      // Si format DD/MM/YYYY
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]} 00:00:00`;
        }
      } 
      // Si format YYYY-MM-DD sans heure
      else if (d.length === 10 && d.includes('-')) {
        formattedDate = `${d} 00:00:00`;
      } 
      // Autre format (on espère que c'est déjà bon)
      else {
        formattedDate = d;
      }
    }

    // Récupération de la secure_key du client (obligatoire pour valider la commande)
    let secureKey = "-1";
    if (data.id_customer) {
      try {
        const customerData = await fetchPrestaShop(`/api/customers/${data.id_customer}`);
        if (customerData?.customer?.secure_key) {
          secureKey = customerData.customer.secure_key;
        }
      } catch (e) {
        console.warn(`Impossible de récupérer la secure_key pour le client ${data.id_customer}`);
      }
    }

    const xml = `
      <prestashop>
        <order>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <id_address_delivery>${data.id_address_delivery}</id_address_delivery>
          <id_address_invoice>${data.id_address_invoice}</id_address_invoice>
          <id_cart>${data.id_cart}</id_cart>
          <id_currency>1</id_currency>
          <id_lang>1</id_lang>
          <id_customer>${data.id_customer}</id_customer>
          <id_carrier>${data.id_carrier || 1}</id_carrier>
          <current_state>${data.status_id || 2}</current_state>
          <module>${data.payment_module}</module>
          <payment>${data.payment_method}</payment>
          <conversion_rate>1.000000</conversion_rate>
          <secure_key>${secureKey}</secure_key>
          <total_paid>${data.total_paid}</total_paid>
          <total_paid_real>${data.total_paid}</total_paid_real>
          <total_products>${data.total_products}</total_products>
          <total_products_wt>${data.total_paid}</total_products_wt>
          <total_shipping>${data.total_shipping}</total_shipping>
          <total_shipping_tax_incl>${data.total_shipping}</total_shipping_tax_incl>
          <total_shipping_tax_excl>${data.total_shipping}</total_shipping_tax_excl>
          <valid>1</valid>
          <date_add>${formattedDate}</date_add>
        </order>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    if (result?.order?.id) {
      this.cache.existingIds.orders.add(String(result.order.id));
    }

    return result;
  }

  /**
   * Import d'un fournisseur (Supplier)
   */
  static async importSupplier(data: any, strictMode: boolean = true): Promise<any> {
    const method = (strictMode && data.id && this.cache.existingIds.suppliers.has(String(data.id))) ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/suppliers/${data.id}` : '/api/suppliers';

    const xml = `
      <prestashop>
        <supplier>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <active>${data.active ?? 1}</active>
          <name><![CDATA[${data.name}]]></name>
          <description>${this.buildLanguageField(data.description || '')}</description>
          <meta_title>${this.buildLanguageField(data.meta_title || '')}</meta_title>
          <meta_description>${this.buildLanguageField(data.meta_description || '')}</meta_description>
          <meta_keywords>${this.buildLanguageField(data.meta_keywords || '')}</meta_keywords>
        </supplier>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    if (result?.supplier?.id) {
      const newId = String(result.supplier.id);
      this.cache.existingIds.suppliers.add(newId);
      this.cache.suppliers[String(data.name).toLowerCase()] = newId;

      // PrestaShop exige qu'un fournisseur ait au moins une adresse pour pouvoir être consulté dans le BO
      await this.ensureSupplierAddress(newId, data.name);
    }

    return result;
  }

  /**
   * Crée une adresse par défaut pour le fournisseur s'il n'en a pas
   * Évite l'erreur "L'adresse de ce fournisseur a été supprimée" dans le BO
   */
  private static async ensureSupplierAddress(supplierId: string, supplierName: string) {
    try {
      const existingAddresses = await fetchPrestaShop(`/api/addresses?filter[id_supplier]=${supplierId}&display=[id]`);
      const hasAddress = existingAddresses?.addresses?.address;

      if (!hasAddress) {
        const addressXml = `
          <prestashop>
            <address>
              <id_supplier>${supplierId}</id_supplier>
              <id_country>1</id_country>
              <id_state>0</id_state>
              <alias><![CDATA[Contact Principal]]></alias>
              <lastname><![CDATA[Fournisseur]]></lastname>
              <firstname><![CDATA[${String(supplierName).substring(0, 32)}]]></firstname>
              <address1><![CDATA[Non renseignée]]></address1>
              <city><![CDATA[Non renseignée]]></city>
            </address>
          </prestashop>`;

        await fetchPrestaShop('/api/addresses', {
          method: 'POST',
          body: addressXml
        });
        console.log(`Adresse par défaut créée pour le fournisseur ${supplierName}`);
      }
    } catch (e) {
      console.error(`Impossible de vérifier/créer l'adresse pour le fournisseur ${supplierName}`, e);
    }
  }

  /**
   * Récupère ou crée un fournisseur par son nom
   */
  private static async getOrCreateSupplier(name: string): Promise<string> {
    const key = name.toLowerCase().trim();
    if (this.cache.suppliers[key]) return this.cache.suppliers[key];

    console.log(`Fournisseur '${name}' non trouvé, création...`);
    try {
      const result = await this.importSupplier({ name, active: 1 }, false);
      return result.supplier.id;
    } catch (e) {
      console.error(`Échec de création du fournisseur ${name}`);
      return "0";
    }
  }

  /**
   * Import d'une marque (Manufacturer)
   */
  static async importBrand(data: any, strictMode: boolean = true): Promise<any> {
    const method = (strictMode && data.id && this.cache.existingIds.brands.has(String(data.id))) ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/manufacturers/${data.id}` : '/api/manufacturers';

    const xml = `
      <prestashop>
        <manufacturer>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <active>${data.active ?? 1}</active>
          <name><![CDATA[${data.name}]]></name>
          <description>${this.buildLanguageField(data.description || '')}</description>
          <short_description>${this.buildLanguageField(data.short_description || '')}</short_description>
          <meta_title>${this.buildLanguageField(data.meta_title || '')}</meta_title>
          <meta_description>${this.buildLanguageField(data.meta_description || '')}</meta_description>
          <meta_keywords>${this.buildLanguageField(data.meta_keywords || '')}</meta_keywords>
        </manufacturer>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    if (result?.manufacturer?.id) {
      const newId = String(result.manufacturer.id);
      this.cache.existingIds.brands.add(newId);
      this.cache.brands[String(data.name).toLowerCase()] = newId;
    }

    return result;
  }

  /**
   * Récupère ou crée une marque par son nom
   */
  private static async getOrCreateBrand(name: string): Promise<string> {
    const key = name.toLowerCase().trim();
    if (this.cache.brands[key]) return this.cache.brands[key];

    console.log(`Marque '${name}' non trouvée, création...`);
    try {
      const result = await this.importBrand({ name, active: 1 }, false);
      return result.manufacturer.id;
    } catch (e) {
      console.error(`Échec de création de la marque ${name}`);
      return "0";
    }
  }

  /**
   * Import d'un magasin (Store)
   */
  static async importStore(data: any, strictMode: boolean = true): Promise<any> {
    const method = (strictMode && data.id && this.cache.existingIds.stores.has(String(data.id))) ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/stores/${data.id}` : '/api/stores';

    // Résolution du pays
    const countryId = data.country ? await this.getOrCreateCountry(data.country) : "1";

    // Résolution de l'état
    let idState = "0";
    if (data.state) {
      idState = await this.getStateId(data.state, countryId);
    }

    const xml = `
      <prestashop>
        <store>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <id_country>${countryId}</id_country>
          <id_state>${idState}</id_state>
          <active>${data.active ?? 1}</active>
          <name>${this.buildLanguageField(data.name || 'Magasin')}</name>
          <address1>${this.buildLanguageField(data.address1 || '')}</address1>
          <address2>${this.buildLanguageField(data.address2 || '')}</address2>
          <postcode>${data.postcode || ''}</postcode>
          <city>${data.city || ''}</city>
          <latitude>${data.latitude || 0}</latitude>
          <longitude>${data.longitude || 0}</longitude>
          <phone>${data.phone || ''}</phone>
          <fax>${data.fax || ''}</fax>
          <email>${data.email || ''}</email>
          <note>${this.buildLanguageField(data.note || '')}</note>
          <hours>${this.buildLanguageField(this.formatStoreHours(data.hours))}</hours>
        </store>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    if (result?.store?.id) {
      this.cache.existingIds.stores.add(String(result.store.id));
    }

    return result;
  }

  /**
   * Récupère l'ID d'un état par son nom
   */
  private static async getStateId(stateName: string, countryId: string): Promise<string> {
    const key = `${countryId}_${stateName.toLowerCase().trim()}`;
    if (this.cache.states[key]) return this.cache.states[key];

    try {
      const states = await this.getAll('states', `filter[name]=${stateName}&filter[id_country]=${countryId}&display=[id]`);
      const id = states?.states?.state?.id || (Array.isArray(states?.states?.state) ? states.states.state[0].id : null);
      if (id) {
        this.cache.states[key] = String(id);
        return String(id);
      }
    } catch (e) {
      console.error(`Erreur lors de la recherche de l'état ${stateName}`);
    }
    return "0";
  }

  /**
   * Formate les horaires du magasin au format JSON attendu par PrestaShop
   */
  private static formatStoreHours(hours: string): string {
    if (!hours) return '[]';
    // Si c'est déjà du JSON, on ne touche à rien
    if (hours.trim().startsWith('[') || hours.trim().startsWith('{')) return hours;

    // Si c'est une liste séparée par des virgules (souvent 7 jours)
    if (hours.includes(',')) {
      const parts = hours.split(',').map(h => h.trim());
      return JSON.stringify(parts);
    }

    // Sinon on retourne tel quel dans un tableau (pour au moins un jour)
    return JSON.stringify([hours.trim()]);
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
   * Crée une catégorie si elle n'existe pas (Helper utilisé par les autres entités)
   */
  private static async getOrCreateCategory(name: string): Promise<string> {
    const key = name.toLowerCase().trim();
    if (this.cache.categories[key]) return this.cache.categories[key];
    if (key === 'home' || key === 'accueil') return "2";

    console.log(`Catégorie '${name}' non trouvée, création...`);
    try {
      const result = await this.importCategory({
        name,
        active: 1,
        parent_category: 'Home'
      }, false);
      return result.category.id;
    } catch (e) {
      console.error(`Échec de création de la catégorie ${name}`);
      return "2"; // Accueil par défaut
    }
  }

  /**
   * Import d'une catégorie complète
   */
  static async importCategory(data: any, strictMode: boolean = true): Promise<any> {
    const method = (strictMode && data.id && this.cache.categories[String(data.name).toLowerCase().trim()]) ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/categories/${data.id}` : '/api/categories';

    // Résolution de la catégorie parente
    let idParent = "2"; // 2 = Accueil (Home) par défaut
    if (data.parent_category) {
      const parentKey = String(data.parent_category).toLowerCase().trim();
      const currentNameKey = String(data.name).toLowerCase().trim();

      if (parentKey === 'home' || parentKey === 'accueil' || parentKey === currentNameKey) {
        // IMPORTANT: On force toujours l'ID 2 pour Home/Accueil AVANT de regarder le cache
        // pour réparer l'arbre corrompu
        idParent = "2";
      } else if (this.cache.categories[parentKey]) {
        idParent = this.cache.categories[parentKey];
      } else {
        // Si la catégorie parente n'existe pas, on la crée récursivement
        idParent = await this.getOrCreateCategory(data.parent_category);
      }
    }

    const xml = `
      <prestashop>
        <category>
          ${method === 'PUT' ? `<id>${data.id}</id>` : ''}
          <id_parent>${idParent}</id_parent>
          <active>${data.active ?? 1}</active>
          <is_root_category>${data.is_root_category ?? 0}</is_root_category>
          <name>${this.buildLanguageField(data.name)}</name>
          <link_rewrite>${this.buildLanguageField(data.link_rewrite || String(data.name).toLowerCase().replace(/[^a-z0-9]/g, '-'))}</link_rewrite>
          <description>${this.buildLanguageField(data.description || '')}</description>
          <meta_title>${this.buildLanguageField(data.meta_title || '')}</meta_title>
          <meta_description>${this.buildLanguageField(data.meta_description || '')}</meta_description>
          <meta_keywords>${this.buildLanguageField(data.meta_keywords || '')}</meta_keywords>
        </category>
      </prestashop>`;

    const result = await fetchPrestaShop(url, {
      method: method,
      body: xml
    });

    if (result?.category?.id) {
      const newId = String(result.category.id);
      this.cache.categories[String(data.name).toLowerCase().trim()] = newId;
    }

    return result;
  }
}
