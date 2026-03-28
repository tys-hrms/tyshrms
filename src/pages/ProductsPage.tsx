import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRBAC } from '../contexts/RBACContext';
import { useAuth } from '../contexts/AuthContext';
import { Product } from '../types';
import { Package, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle2, Camera, X, ZapOff, Upload, ChevronUp, ChevronDown, Search, DatabaseZap } from 'lucide-react';

export default function ProductsPage() {
  const { session } = useAuth();
  const { products, addProduct, addProducts, updateProduct, deleteProduct, clearProducts } = useApp();
  const { settings } = useSettings();
  const { can } = useRBAC();

  const userRole = session.currentUser?.role;
  const canView = userRole ? can(userRole, 'products', 'view') : false;
  const canCreate = userRole ? can(userRole, 'products', 'create') : false;
  const canDelete = userRole ? can(userRole, 'products', 'delete') : false;
  const canEdit = userRole ? can(userRole, 'products', 'edit') : false;

  const [isAdding, setIsAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt'>>({
    sku: '',
    title: '',
    unit: 'Piece',
    imageUrl: '',
  });

  const [sortConfig, setSortConfig] = useState<{ key: 'sku' | 'title'; direction: 'asc' | 'desc' } | null>({ key: 'title', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Camera state ---
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = useCallback(async () => {
    setCameraError('');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions and try again.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraError('');
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
    stopCamera();
  }, [stopCamera]);

  if (!canView) return <div className="text-red-400 p-6">Access Denied</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.title) return;
    
    addProduct(formData);
    setIsAdding(false);
    setFormData({ sku: '', title: '', unit: 'Piece', imageUrl: '' });
  };

  const handleSync = async () => {
    if (!settings.shopify.syncEnabled || !settings.shopify.storeUrl) {
      setSyncError('Shopify synchronization is not configured in Settings.');
      return;
    }

    setSyncing(true);
    setSyncError('');
    setSyncSuccess('');

    // Shopify sync requires a backend edge function (e.g., via MongoDB Atlas Functions)
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(`Ready to sync from ${settings.shopify.storeUrl}. Configure a MongoDB Atlas Function to complete the Shopify integration.`);
    }, 1500);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Robust CSV Parser (Handles quoted newlines and commas)
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i+1];
        if (char === '"' && inQuotes && nextChar === '"') {
          currentCell += '"'; i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentCell.trim()); currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
          }
          if (char === '\r' && nextChar === '\n') i++;
        } else {
          currentCell += char;
        }
      }
      // Last row if not ended by newline
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
      }

      if (rows.length < 2) return;

      const headers = rows[0].map(h => h.toLowerCase().replace(/^"|"$/g, ''));
      const skuIdx = headers.findIndex(h => h === 'variant sku' || h === 'sku');
      const titleIdx = headers.findIndex(h => h === 'title' || h === 'name');
      const imgIdx = headers.findIndex(h => h === 'variant image' || h === 'image src');

      if (skuIdx === -1 || titleIdx === -1) {
        setSyncError('Invalid CSV format. Could not find SKU or Title columns.');
        return;
      }

      const newProducts: Omit<Product, 'id' | 'createdAt'>[] = [];
      let lastTitle = '';

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const sku = row[skuIdx]?.replace(/^"|"$/g, '');
        const title = (row[titleIdx]?.replace(/^"|"$/g, '')) || lastTitle;
        const imageUrl = imgIdx !== -1 ? row[imgIdx]?.replace(/^"|"$/g, '') : '';

        if (sku && title) {
          const exists = products.some(p => p.sku === sku) || newProducts.some(p => p.sku === sku);
          if (!exists) {
            newProducts.push({
              sku,
              title,
              unit: 'Piece',
              imageUrl: imageUrl || undefined,
            });
          }
        }
        if (row[titleIdx]) lastTitle = row[titleIdx].replace(/^"|"$/g, '');
      }

      if (newProducts.length > 0) {
        setCsvUploading(true);
        setSyncError('');
        setSyncSuccess('');
        try {
          await addProducts(newProducts);
          setSyncSuccess(`✓ Imported ${newProducts.length} products and pushed to MongoDB.`);
        } catch {
          setSyncError('CSV imported locally but MongoDB push failed. Check your connection.');
        } finally {
          setCsvUploading(false);
        }
      } else {
        setSyncSuccess('No new products to import (all SKUs already exist).');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearProducts = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    setSyncError('');
    setSyncSuccess('');
    try {
      await clearProducts();
      setSyncSuccess('All products cleared from catalog and database.');
    } catch {
      setSyncError('Failed to clear products from database.');
    } finally {
      setClearing(false);
    }
  };

  const sortedProducts = [...products]
    .filter(p => 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
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

  const toggleSort = (key: 'sku' | 'title') => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h1>
          <p className="text-slate-400 text-sm mt-1">Manage warehouse inventory items and Shopify sync.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCSVUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={csvUploading}
            className={`flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors ${csvUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {csvUploading ? (
              <><DatabaseZap className="w-4 h-4 mr-2 animate-pulse text-blue-400" /> Pushing to DB...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload CSV</>
            )}
          </button>
          
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Shopify'}
          </button>

          {canDelete && products.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing}
              className={`flex items-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-medium rounded-xl transition-all ${clearing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Trash2 className={`w-4 h-4 mr-2 ${clearing ? 'animate-pulse' : ''}`} />
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
          )}
          
          {canCreate && !isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </button>
          )}
        </div>
      </div>

      {syncError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{syncError}</p>
        </div>
      )}

      {syncSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center text-emerald-400">
          <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{syncSuccess}</p>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">New Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">SKU / Barcode</label>
              <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Unit Type</label>
              <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none appearance-none">
                <option value="Piece">Piece</option>
                <option value="Box">Box</option>
                <option value="Kg">Kg</option>
                <option value="Set">Set</option>
              </select>
            </div>
            <div className="lg:col-span-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Image (Optional)</label>

              {/* Camera preview overlay */}
              {cameraOpen && (
                <div className="mb-3 rounded-xl overflow-hidden border border-slate-700 bg-black relative">
                  {cameraError ? (
                    <div className="flex flex-col items-center justify-center py-10 text-red-400 gap-2">
                      <ZapOff className="w-8 h-8" />
                      <p className="text-sm text-center px-4">{cameraError}</p>
                      <button type="button" onClick={stopCamera} className="mt-2 px-4 py-1.5 bg-slate-700 text-white rounded-lg text-sm">Close</button>
                    </div>
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover" />
                      <div className="flex justify-center gap-3 p-3 bg-slate-900/80 absolute bottom-0 w-full">
                        <button type="button" onClick={capturePhoto} className="flex items-center gap-2 px-5 py-2 bg-custom-blue hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                          <Camera className="w-4 h-4" /> Capture
                        </button>
                        <button type="button" onClick={stopCamera} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Image preview */}
              {formData.imageUrl && !cameraOpen && (
                <div className="mb-3 relative inline-block">
                  <img src={formData.imageUrl} alt="Preview" className="h-24 w-24 object-cover rounded-xl border border-slate-700 shadow" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={(formData.imageUrl ?? '').startsWith('data:') ? '' : (formData.imageUrl ?? '')}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder={(formData.imageUrl ?? '').startsWith('data:') ? '📷 Photo captured' : 'https://...'}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none"
                />
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Use Camera</span>
                </button>
              </div>

              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-custom-blue text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">Save Product</button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by SKU or Name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-custom-blue outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {sortedProducts.length} products
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/20">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20">Image</th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('sku')}
                >
                  <div className="flex items-center gap-2">
                    SKU
                    {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Product Name
                    {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center p-1">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm font-mono font-medium text-custom-blue">{product.sku}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-white">{product.title}</td>
                  <td className="px-6 py-3 text-sm text-slate-400">{product.unit}</td>
                  <td className="px-6 py-3">
                    {product.shopifyProductId ? (
                       <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                         Shopify
                       </span>
                    ) : product.mongoSynced ? (
                       <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                         <DatabaseZap className="w-2.5 h-2.5" /> MongoDB
                       </span>
                    ) : (
                       <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
                         Local
                       </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {canDelete && (
                      <button 
                        onClick={() => deleteProduct(product.id)} 
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {sortedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-slate-600 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
                      <p className="text-sm text-slate-400 max-w-md">
                        {searchTerm ? `No results for "${searchTerm}"` : 'Add products manually or upload a Shopify CSV file.'}
                      </p>
                      {!searchTerm && (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-6 flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-700"
                        >
                          <Upload className="w-4 h-4 mr-2" /> Upload Shopify CSV
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Clear All Products?</h3>
                <p className="text-sm text-slate-400">This will remove all {products.length} products.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              This action will permanently delete all products from the catalog <span className="text-red-400 font-medium">and from MongoDB</span>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearProducts}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
