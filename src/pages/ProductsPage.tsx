import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRBAC } from '../contexts/RBACContext';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types';
import { Package, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle2, Search, DatabaseZap, ChevronUp, ChevronDown } from 'lucide-react';

export default function ProductsPage() {
  const { session } = useAuth();
  const { products, addProduct, addProducts, deleteProduct, clearProducts } = useApp();
  const { settings } = useSettings();
  const { can } = useRBAC();

  const userRole = session.currentUser?.role;
  const canView = userRole ? can(userRole, 'products', 'view') : false;
  const canCreate = userRole ? can(userRole, 'products', 'create') : false;
  const canDelete = userRole ? can(userRole, 'products', 'delete') : false;

  const [isAdding, setIsAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'created_at'>>({
    sku: '',
    name: '',
    category: 'General',
    quantity: 0,
    unit: 'Piece',
    min_stock: 0,
    tenant_id: session.tenant?.id || '',
  });

  const [sortConfig, setSortConfig] = useState<{ key: 'sku' | 'name'; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!canView) return <div className="text-red-400 p-6 font-bold uppercase tracking-widest text-xs">Access Denied</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name) return;
    addProduct(formData);
    setIsAdding(false);
    setFormData({ sku: '', name: '', category: 'General', quantity: 0, unit: 'Piece', min_stock: 0, tenant_id: session.tenant?.id || '' });
  };

  const handleSync = async () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(`Ready to sync. Configure a Cloud Function to complete integration.`);
    }, 1500);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const rows = text.split('\n').map(row => row.split(','));
      if (rows.length < 2) return;
      
      const newProducts: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const [sku, name, qty] = rows[i];
        if (sku && name) {
          newProducts.push({
            sku,
            name,
            quantity: parseInt(qty || '0', 10),
            category: 'General',
            unit: 'Piece',
            min_stock: 0,
            tenant_id: session.tenant?.id || '',
          });
        }
      }

      if (newProducts.length > 0) {
        setCsvUploading(true);
        try {
          await addProducts(newProducts);
          setSyncSuccess(`✓ Imported ${newProducts.length} products.`);
        } finally {
          setCsvUploading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearProducts = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try {
      await clearProducts();
      setSyncSuccess('All products cleared.');
    } finally {
      setClearing(false);
    }
  };

  const sortedProducts = [...products]
    .filter(p => 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      const valA = a[key].toLowerCase();
      const valB = b[key].toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (key: 'sku' | 'name') => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-custom-blue/10 rounded-2xl">
            <Package className="w-6 h-6 text-custom-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h1>
            <p className="text-slate-400 text-sm mt-1">Manage warehouse inventory and cloud synchronization.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={csvUploading} className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
            {csvUploading ? <DatabaseZap className="w-4 h-4 mr-2 animate-pulse text-blue-400" /> : <Plus className="w-4 h-4 mr-2" />}
            Upload CSV
          </button>
          <button onClick={handleSync} disabled={syncing} className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Cloud
          </button>
          {canDelete && products.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)} disabled={clearing} className="flex items-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl transition-all">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Catalog
            </button>
          )}
          {canCreate && !isAdding && (
            <button onClick={() => setIsAdding(true)} className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors text-sm font-bold uppercase tracking-wider">
              <Plus className="w-4 h-4 mr-2" /> Add SKU
            </button>
          )}
        </div>
      </div>

      {syncError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {syncError}</div>}
      {syncSuccess && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {syncSuccess}</div>}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-custom-blue" />
            New SKU Enrollment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest text-[10px] font-black">SKU / Barcode</label>
              <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none transition-all" placeholder="e.g. TYS-7782" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest text-[10px] font-black">Product Title</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none transition-all" placeholder="Enter descriptive name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest text-[10px] font-black">Unit Type</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none appearance-none cursor-pointer">
                <option value="Piece">Piece (Standard)</option>
                <option value="Box">Box</option>
                <option value="Kg">Kg</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest text-[10px] font-black">Initial Inventory</label>
              <input type="number" min="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value || '0', 10)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none font-bold transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-widest text-[10px] font-black">Min Stock Alert</label>
              <input type="number" min="0" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: parseInt(e.target.value || '0', 10)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-custom-blue outline-none transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Cancel</button>
            <button type="submit" className="px-8 py-3 bg-custom-blue text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Enroll Product</button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search catalog..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-custom-blue outline-none transition-all placeholder:text-slate-600 font-bold" />
          </div>
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
            {sortedProducts.length} SKU(s) Loaded
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('sku')}>
                  <div className="flex items-center gap-2">SKU {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2">Title {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Quantity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Unit</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono font-bold text-custom-blue tracking-wide">{product.sku}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white tracking-tight">{product.name}</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-950 border border-slate-800 text-slate-300">{product.quantity || 0}</span></td>
                  <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{product.unit}</td>
                  <td className="px-6 py-4 text-right">
                    {canDelete && (
                      <button onClick={() => deleteProduct(product.id)} className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr className="bg-slate-900/30">
                  <td colSpan={5} className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                    No results matched your inquiry
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-800 p-4 bg-slate-950/80 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-50">Prev</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6"><AlertCircle className="w-8 h-8 text-rose-500" /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Destroy Catalog?</h3>
              <p className="text-xs text-slate-500 mt-2 font-bold leading-relaxed uppercase tracking-widest">This will permanently delete {products.length} products from the cloud database.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Abort Action</button>
              <button onClick={handleClearProducts} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20">Confirm Destruction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
