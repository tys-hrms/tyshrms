import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
  Package, Plus, Trash2, IndianRupee, Percent, 
  Truck, Calculator, Receipt, ChevronRight, Search
} from 'lucide-react';
import { CRMOrderItem, Product } from '../../types';

interface PricingLedgerProps {
  leadId: string;
  initialItems?: CRMOrderItem[];
  initialTransportation?: number;
  onSave: (items: CRMOrderItem[], transportation: number, total: number) => void;
}

export default function LeadPricingLedger({ leadId, initialItems = [], initialTransportation = 0, onSave }: PricingLedgerProps) {
  const { products } = useApp();
  const [items, setItems] = useState<CRMOrderItem[]>(initialItems);
  const [transportation, setTransportation] = useState<number>(initialTransportation);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Calculations ---
  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + (item.base_price * item.quantity), 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.base_price * item.quantity * (item.discount_percent / 100)), 0);
    const totalGst = items.reduce((acc, item) => {
      const discountedPrice = (item.base_price * item.quantity) - (item.base_price * item.quantity * (item.discount_percent / 100));
      return acc + (discountedPrice * (item.gst_percent / 100));
    }, 0);
    const grandTotal = subtotal - totalDiscount + totalGst + transportation;

    return { subtotal, totalDiscount, totalGst, grandTotal };
  }, [items, transportation]);

  const addItem = (product: Product) => {
    const newItem: CRMOrderItem = {
      sku: product.sku,
      quantity: 1,
      base_price: 0, // Manual entry for flexibility
      discount_percent: 0,
      gst_percent: 18,
      total: 0
    };
    setItems([...items, newItem]);
    setSearchQuery('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<CRMOrderItem>) => {
    const next = items.map((item, i) => i === index ? { ...item, ...updates } : item);
    setItems(next);
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-custom-blue" />
          Pricing Ledger & SKU Breakup
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-custom-blue/10 border border-custom-blue/20 rounded-full">
           <Calculator className="w-3.5 h-3.5 text-custom-blue" />
           <span className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Auto-Calculating</span>
        </div>
      </div>

      {/* SKU Search/Add */}
      <div className="relative">
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 focus-within:border-custom-blue transition-all">
           <Search className="w-4 h-4 text-slate-500 mr-3" />
           <input 
              type="text" 
              placeholder="Search SKUs from inventory to add..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm text-white w-full outline-none"
           />
        </div>
        
        {searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
             {filteredProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-none"
                >
                   <div>
                      <p className="text-sm font-bold text-white uppercase">{p.sku}</p>
                      <p className="text-[10px] text-slate-500">{p.name}</p>
                   </div>
                   <Plus className="w-4 h-4 text-custom-blue" />
                </button>
             ))}
             {filteredProducts.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 italic">No matching products found.</div>
             )}
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
         <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800">
               <tr>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">SKU Detail</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Price (Base)</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Disc%</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">GST%</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Row Total</th>
                  <th className="p-4"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
               {items.map((item, i) => {
                  const rowSub = item.quantity * item.base_price;
                  const rowDisc = rowSub * (item.discount_percent / 100);
                  const rowGst = (rowSub - rowDisc) * (item.gst_percent / 100);
                  const rowTotal = rowSub - rowDisc + rowGst;

                  return (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                       <td className="p-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                <Package className="w-4 h-4 text-slate-500" />
                             </div>
                             <span className="text-sm font-bold text-white uppercase">{item.sku}</span>
                          </div>
                       </td>
                       <td className="p-4">
                          <input 
                             type="number" 
                             value={item.quantity}
                             onChange={e => updateItem(i, { quantity: parseInt(e.target.value) || 0 })}
                             className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-custom-blue"
                          />
                       </td>
                       <td className="p-4">
                          <div className="relative">
                             <input 
                               type="number" 
                               value={item.base_price}
                               onChange={e => updateItem(i, { base_price: parseInt(e.target.value) || 0 })}
                               className="w-24 bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white outline-none focus:border-custom-blue font-mono"
                             />
                             <IndianRupee className="w-3 h-3 text-slate-600 absolute left-2 top-2.5" />
                          </div>
                       </td>
                       <td className="p-4">
                          <div className="relative">
                             <input 
                               type="number" 
                               value={item.discount_percent}
                               onChange={e => updateItem(i, { discount_percent: parseInt(e.target.value) || 0 })}
                               className="w-16 bg-slate-950 border border-slate-800 rounded-lg pr-5 pl-2 py-1.5 text-xs text-white outline-none focus:border-custom-blue font-mono"
                             />
                             <Percent className="w-3 h-3 text-slate-600 absolute right-2 top-2.5" />
                          </div>
                       </td>
                       <td className="p-4">
                          <select 
                             value={item.gst_percent}
                             onChange={e => updateItem(i, { gst_percent: parseInt(e.target.value) })}
                             className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2 py-1.5 focus:border-custom-blue"
                          >
                             <option value="0">0%</option>
                             <option value="5">5%</option>
                             <option value="12">12%</option>
                             <option value="18">18%</option>
                          </select>
                       </td>
                       <td className="p-4 text-right">
                          <span className="text-sm font-black text-white font-mono">₹{rowTotal.toLocaleString()}</span>
                       </td>
                       <td className="p-4 text-right">
                          <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                  );
               })}
               {items.length === 0 && (
                  <tr>
                     <td colSpan={7} className="p-12 text-center text-slate-600 font-medium italic">
                        No SKUs added to ledger. Use the search bar above to begin.
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Transportation */}
         <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Truck className="w-3.5 h-3.5" /> Logistic Charges
               </h4>
               <div className="relative">
                  <input 
                    type="number" 
                    value={transportation}
                    onChange={e => setTransportation(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all font-mono"
                    placeholder="0.00"
                  />
                  <IndianRupee className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
               </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium">Flat fee added to the grand total for transportation, customs, or handling.</p>
         </div>

         {/* Summary Ledger */}
         <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="grid grid-cols-2 gap-8 h-full">
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tighter">
                     <span>Subtotal</span>
                     <span className="text-white">₹{totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tighter">
                     <span>Discount Applied</span>
                     <span className="text-rose-400">- ₹{totals.totalDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tighter">
                     <span>Integrated GST</span>
                     <span className="text-emerald-400">+ ₹{totals.totalGst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tighter pt-2 border-t border-slate-800">
                     <span>Transportation</span>
                     <span className="text-white">+ ₹{transportation.toLocaleString()}</span>
                  </div>
               </div>
               
               <div className="bg-slate-950 rounded-2xl p-6 flex flex-col justify-center items-center relative overflow-hidden border border-slate-800">
                  <div className="absolute inset-0 bg-custom-blue/5 blur-3xl rounded-full" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Grand Total Estimate</p>
                  <div className="text-4xl font-black text-white tracking-tighter relative z-10 font-mono">
                     ₹{totals.grandTotal.toLocaleString()}
                  </div>
                  
                  <button 
                    onClick={() => onSave(items, transportation, totals.grandTotal)}
                    className="w-full mt-6 py-3 bg-custom-blue hover:bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-custom-blue/20 flex items-center justify-center gap-2"
                  >
                    Save & Update Ledger
                    <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
