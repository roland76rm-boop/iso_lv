
import React from 'react';
import { Project } from '../types';

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
  onCustomerClick: (num: string) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onCustomerClick }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all">
      <div 
        className="bg-white w-full max-w-2xl max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Bar */}
        <div className="flex h-1.5 w-full">
          <div className="flex-1 bg-[#E20074]"></div>
          <div className="flex-1 bg-[#8CC63F]"></div>
          <div className="flex-1 bg-[#00AEEF]"></div>
        </div>

        {/* Header */}
        <div className="px-8 py-6 border-b flex justify-between items-start">
          <div className="pr-8">
            <p className="text-[#E20074] text-[10px] font-black uppercase tracking-widest mb-1">{project.status || 'PROJEKT-DETAILS'}</p>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{project.projectName}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900 mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planer / Büro</p>
              <p className="text-slate-900 font-bold text-lg">{project.planner || <span className="text-slate-300 italic">Unbekannt</span>}</p>
              <p className="text-slate-400 text-xs">P-Nr: {project.plannerNumber || '-'}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anfragende Elektriker</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {project.customerNumbers.length > 0 ? (
                  project.customerNumbers.map((num, i) => (
                    <button 
                      key={i} 
                      onClick={() => onCustomerClick(num)}
                      className="px-3 py-1 bg-[#8CC63F]/10 text-[#5a8a1f] text-sm font-black rounded-lg border border-[#8CC63F]/20 hover:bg-[#8CC63F] hover:text-white transition-all"
                    >
                      {num}
                    </button>
                  ))
                ) : (
                  <span className="text-slate-300 text-sm italic font-medium">Keine Nummern übermittelt</span>
                )}
              </div>
            </div>
          </div>

          {project.description && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Zusätzliche Infos</p>
              <p className="text-slate-600 text-sm leading-relaxed italic">"{project.description}"</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
            <button 
              className="flex items-center justify-between w-full text-left group"
              onClick={() => {
                const el = document.getElementById('raw-data');
                if(el) el.classList.toggle('hidden');
              }}
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weitere Projektdetails</p>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            <div id="raw-data" className="hidden mt-4 bg-slate-50 rounded-2xl p-6 grid grid-cols-1 gap-y-3">
              {Object.entries(project.allData).map(([key, value]) => {
                if (!value || ['Projektname1', '__PowerAppsId__', 'Pfad', 'Elementtyp'].includes(key)) return null;

                let displayKey = key;
                let displayValue = value.toString();

                const normalizedKey = key.toLowerCase().trim();
                const upperVal = displayValue.toUpperCase().trim();

                // Spezielles Mapping für Iso-Spalte
                if (normalizedKey.includes('iso in lv') || normalizedKey.includes('isoled in lv')) {
                  displayKey = 'Isoled Artikel in LV';
                  displayValue = (upperVal === 'WAHR' || upperVal === 'TRUE' || upperVal === 'JA') ? 'JA' : 'NEIN';
                } else if (upperVal === 'WAHR' || upperVal === 'TRUE' || upperVal === 'JA') {
                  displayValue = 'JA';
                } else if (upperVal === 'FALSCH' || upperVal === 'FALSE' || upperVal === 'NEIN') {
                  displayValue = 'NEIN';
                }

                return (
                  <div key={key} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-200/50 last:border-0 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{displayKey}</span>
                    <span className="text-sm text-slate-800 font-medium sm:text-right">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-8 py-5 bg-slate-50 border-t flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hinzugefügt am: {project.date || 'k.A.'}</span>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all font-black text-sm active:scale-95 shadow-lg"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
