import React, { useEffect, useState, useCallback } from 'react';
import { PRESTASHOP_CONFIG } from '../api/prestashop';
import { ProductService } from '../services/ProductService';
import type { Product, Category, MultilangField } from '../services/ProductService';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 10;
// ... (le reste du fichier reste identique)
  const loadCategories = useCallback(async () => {
    const res = await ProductService.getCategories();
    setCategories(res);
  }, []);

  const loadTotalCount = useCallback(async (catId: string) => {
    const count = await ProductService.getTotalCount(catId);
    setTotalProducts(count);
  }, []);

  const loadProducts = useCallback(async (catId: string, page: number) => {
    setLoading(true);
    const res = await ProductService.getProducts(page, itemsPerPage, catId);
    setProducts(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadTotalCount(selectedCategory);
  }, [selectedCategory, loadTotalCount]);

  useEffect(() => {
    loadProducts(selectedCategory, currentPage);
  }, [selectedCategory, currentPage, loadProducts]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getLanguageValue = (field: MultilangField): string => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object' && 'language' in field) {
      return Array.isArray(field.language) ? field.language[0] : field.language;
    }
    return '';
  };

  const getImageUrl = (product: Product) => {
    if (!product.id_default_image || product.id_default_image === '0') {
      return 'https://via.placeholder.com/50';
    }
    return `/api/images/products/${product.id}/${product.id_default_image}?ws_key=${PRESTASHOP_CONFIG.wsKey}`;
  };

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return (
    <>
      <div className="page-header">
        <div className="breadcrumbs">Catalogue &gt; Produits</div>
        <div className="page-title-container">
          <h1 className="page-title">Produits ({totalProducts})</h1>
          <div className="page-actions">
            <button className="btn-outline">Services Activés</button>
            <button className="btn-primary">+ Nouveau produit</button>
          </div>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="card">
          <div className="card-header">
            <select 
              value={selectedCategory} 
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="btn-outline"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{getLanguageValue(cat.name)}</option>
              ))}
            </select>
            <div style={{fontSize: '13px', color: '#6c868e'}}>
              Page {currentPage} sur {totalPages || 1}
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div style={{padding: '40px', textAlign: 'center'}}>Chargement via ProductService...</div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th style={{width: '40px'}}><input type="checkbox" /></th>
                      <th style={{width: '60px'}}>ID</th>
                      <th style={{width: '80px'}}>Image</th>
                      <th>Nom</th>
                      <th>Référence</th>
                      <th>HT</th>
                      <th>Quantité</th>
                      <th>État</th>
                      <th style={{textAlign: 'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td><input type="checkbox" /></td>
                        <td>{product.id}</td>
                        <td><img src={getImageUrl(product)} alt="Product" className="product-img" /></td>
                        <td>{getLanguageValue(product.name)}</td>
                        <td>{product.reference}</td>
                        <td>{parseFloat(product.price).toFixed(2)} €</td>
                        <td>{product.quantity}</td>
                        <td><div className={`status-switch ${product.active === '1' ? 'active' : ''}`}></div></td>
                        <td style={{textAlign: 'right'}}>
                          <button className="action-btn">✏️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#6c868e' }}>{totalProducts} produits au total</div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn-outline" onClick={() => handlePageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>&lt;</button>
                    <button className="btn-outline" onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>&gt;</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductsPage;
