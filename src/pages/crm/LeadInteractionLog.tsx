import React, { useState } from 'react';
import { 
  MessageCircle, Phone, Mail, 
  Users, StickyNote, Plus, Send,
  Calendar, Clock, User
} from 'lucide-react';
import { CRMLead, CRMInteraction } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  lead: CRMLead;
}

const TYPE_ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  note: StickyNote
};

export default function LeadInteractionLog({ lead }: Props) {
  const { updateLead } = useCRM();
  const { session } = useAuth();
  const [type, setType] = useState<CRMInteraction['type']>('note');
  const [note, setNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!note.trim()) return;

    const newInteraction: CRMInteraction = {
      id: Date.now().toString(),
      type,
      note: note.trim(),
      createdBy: session.currentUser?.name || 'System',
      createdAt: new Date().toISOString()
    };

    const interactions = [...(lead.interactions || []), newInteraction];
    await updateLead(lead.id, { interactions, lastContactedAt: new Date().toISOString() });
    setNote('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <MessageCircle className="w-3 h-3 text-custom-blue" /> Interaction History
        </h4>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] font-black text-custom-blue hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Log
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            {(['note', 'call', 'whatsapp', 'email', 'meeting'] as const).map(t => {
              const Icon = TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`p-2 rounded-lg border transition-all ${
                    type === t ? 'bg-slate-800 border-custom-blue text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title={t.toUpperCase()}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <div className="relative">
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`Write a ${type} log...`}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-custom-blue outline-none transition-all resize-none h-24"
            />
            <button 
              disabled={!note.trim()}
              onClick={handleAdd}
              className="absolute bottom-3 right-3 p-2 bg-custom-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg shadow-lg transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-800/50">
        {lead.interactions?.slice().reverse().map((item) => {
          const Icon = TYPE_ICONS[item.type];
          return (
            <div key={item.id} className="relative pl-10 group">
              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 bg-slate-800 z-10 group-first:bg-custom-blue group-first:border-custom-blue/20" />
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-3 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      <Icon className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{item.type}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 uppercase">
                    {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.note}</p>
                <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                  <User className="w-3 h-3" /> Logged By {item.createdBy}
                </div>
              </div>
            </div>
          );
        })}

        {(!lead.interactions || lead.interactions.length === 0) && (
          <div className="pl-10 text-xs text-slate-600 italic py-4">
            No interactions recorded yet. Start logging communication to track sales progress.
          </div>
        )}
      </div>
    </div>
  );
}
