
import React, { useState, useEffect, useMemo } from 'react';
import { Project } from './types';
import { fetchProjects } from './services/dataService';
import ProjectModal from './components/ProjectModal';

const ISOLED_LOGO_URL = 'https://www.isoled.shop/media/logo/stores/1/Isoled-Logo-claim_final.png';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVm, setSelectedVm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter-Optionen generieren
  const vms = useMemo(() => {
    const uniqueVms = new Set(projects.map(p => p.allData['VM']).filter(Boolean));
    return Array.from(uniqueVms).sort();
  }, [projects]);

  const statuses = useMemo(() => {
    const uniqueStatuses = new Set(projects.map(p => p.status).filter(Boolean));
    return Array.from(uniqueStatuses).sort();
  }, [projects]);

  // Statistik-Berechnungen
  const stats = useMemo(() => {
    const total = projects.length;
    
    // Robuste Suche nach "Iso in LV" Spalte
    const isoInLvCount = projects.filter(p => {
      // Suche flexibler nach der Spalte, falls Leerzeichen oder Formate variieren
      const isoKey = Object.keys(p.allData).find(k => 
        k.toLowerCase().trim() === 'iso in lv' || 
        k.toLowerCase().trim() === 'isoled in lv'
      );
      const val = (isoKey ? p.allData[isoKey] : '').toString().toUpperCase().trim();
      return val === 'WAHR' || val === 'TRUE' || val === 'JA';
    }).length;

    const isoInLvPercent = total > 0 ? Math.round((isoInLvCount / total) * 100) : 0;

    // Verbessertes Parsing für europäische Zahlenformate (z.B. 1.234.567,89)
    const parseGermanNumber = (valStr: string): number => {
      if (!valStr) return 0;
      // 1. Entferne alle Währungszeichen und Leerzeichen
      let clean = valStr.replace(/[^0-9,.-]/g, '').trim();
      
      // 2. Wenn sowohl Punkt als auch Komma vorkommen (z.B. 1.234,56)
      if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } 
      // 3. Wenn nur ein Komma vorkommt (Dezimaltrenner)
      else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      }
      // 4. Wenn Punkte vorkommen, aber kein Komma, prüfen ob es Tausender-Punkte sind
      // (Ein Punkt an drittletzter Stelle könnte auch ein Dezimalpunkt sein, 
      // aber in dieser Liste sind es meist Tausender oder große Summen)
      else if (clean.includes('.')) {
        // Falls mehr als ein Punkt da ist -> definitiv Tausender
        const parts = clean.split('.');
        if (parts.length > 2) {
          clean = clean.replace(/\./g, '');
        }
      }

      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Angebotswert Berechnung
    const totalValue = projects.reduce((sum, p) => {
      const valueKey = Object.keys(p.allData).find(k => 
        k.toLowerCase().includes('angebotswert') || 
        k.toLowerCase().includes('gesamtsumme') ||
        k.toLowerCase().trim() === 'summe'
      );
      const valueStr = valueKey ? p.allData[valueKey] : '0';
      return sum + parseGermanNumber(valueStr);
    }, 0);

    const countAT = projects.filter(p => p.allData['Pfad']?.includes('/AT/') || p.allData['Land']?.toUpperCase() === 'AT').length;
    const countDE = projects.filter(p => p.allData['Pfad']?.includes('/DE/') || p.allData['Land']?.toUpperCase() === 'DE').length;
    
    return { total, isoInLvPercent, totalValue, countAT, countDE };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    
    return projects.filter(project => {
      const matchesSearch = !query || (
        project.projectName.toLowerCase().includes(query) ||
        project.planner.toLowerCase().includes(query) ||
        project.plannerNumber.toLowerCase().includes(query) ||
        project.rawCustomerNumbers.toLowerCase().includes(query) ||
        project.customerNumbers.some(num => num.toLowerCase().includes(query))
      );
      
      const matchesVm = !selectedVm || project.allData['VM'] === selectedVm;
      const matchesStatus = !selectedStatus || project.status === selectedStatus;

      return matchesSearch && matchesVm && matchesStatus;
    });
  }, [projects, searchTerm, selectedVm, selectedStatus]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('geliefert')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (s.includes('ausgeschrieben')) return 'bg-sky-50 text-sky-700 border-sky-100';
    if (s.includes('vergeben')) return 'bg-pink-50 text-[#E20074] border-pink-100';
    if (s.includes('abgebrochen') || s.includes('nicht geliefert')) return 'bg-slate-50 text-slate-500 border-slate-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const handleCustomerClick = (num: string) => {
    setSearchTerm(num);
    setSelectedVm('');
    setSelectedStatus('');
    setSelectedProject(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans selection:bg-[#E20074]/10">
      
      {/* Friendly Light Stats Bar Top */}
      {!loading && !error && projects.length > 0 && (
        <div className="bg-white border-b border-slate-100 py-3 px-6 shadow-sm">
          <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-y-3">
            <div className="flex flex-wrap items-center gap-x-10 gap-y-2 text-[10px] font-black uppercase tracking-[0.15em]">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#00AEEF]"></span>
                <span className="text-slate-400">Projekte:</span>
                <span className="text-slate-900 text-sm">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#8CC63F]"></span>
                <span className="text-slate-400">Isoled in LV:</span>
                <span className="text-[#547526] text-sm">{stats.isoInLvPercent}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E20074]"></span>
                <span className="text-slate-400">Angebotswert gesamt:</span>
                <span className="text-[#E20074] text-sm">{formatCurrency(stats.totalValue)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                <span className="text-slate-400">Region:</span>
                <span className="text-slate-900 text-sm">{stats.countAT} AT / {stats.countDE} DE</span>
              </div>
            </div>
            
            <div className="hidden sm:block">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">ISOLED Live-Dashboard v2.6</span>
            </div>
          </div>
        </div>
      )}

      {/* ISOLED Branding Header */}
      <header className="bg-white border-b border-slate-50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
            <div className="shrink-0">
              <img 
                src={ISOLED_LOGO_URL} 
                alt="ISOLED" 
                className="h-16 w-auto object-contain"
              />
              <div className="flex gap-1 h-1 w-full mt-1.5">
                <div className="flex-1 bg-[#E20074]"></div>
                <div className="flex-1 bg-[#8CC63F]"></div>
                <div className="flex-1 bg-[#00AEEF]"></div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full max-w-5xl">
              <div className="relative min-w-[180px]">
                <select
                  className="appearance-none w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-bold text-xs outline-none focus:border-[#E20074]/40 transition-all cursor-pointer shadow-sm"
                  value={selectedVm}
                  onChange={(e) => setSelectedVm(e.target.value)}
                >
                  <option value="">Filter nach VM</option>
                  {vms.map(vm => <option key={vm} value={vm}>{vm}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <div className="relative min-w-[180px]">
                <select
                  className="appearance-none w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-bold text-xs outline-none focus:border-[#00AEEF]/40 transition-all cursor-pointer shadow-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">Filter nach Status</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Projektname, Planer oder Kundennummer..."
                  className="block w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-[#8CC63F]/40 rounded-xl text-slate-900 placeholder-slate-400 transition-all outline-none text-base shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-[#E20074] transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-3 border-slate-100 border-t-[#E20074] rounded-full animate-spin mb-6"></div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">Lade Projektdaten...</p>
          </div>
        ) : error ? (
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-16 text-center max-w-2xl mx-auto mt-20">
            <h3 className="text-2xl font-black text-slate-900 mb-4">Verbindungsfehler</h3>
            <p className="text-slate-500 mb-10">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-12 py-4 bg-[#E20074] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl">
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-2.5 bg-slate-50 rounded-lg mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
              <div className="col-span-4">Projektname</div>
              <div className="col-span-3">Planer / Büro</div>
              <div className="col-span-2">Elektriker KndNr</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Datum</div>
            </div>

            {/* List Rows - Compact */}
            <div className="space-y-1">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 px-8 py-2.5 items-center bg-white border border-slate-50 hover:border-[#00AEEF]/30 hover:shadow-sm transition-all cursor-pointer group rounded-lg active:scale-[0.999]"
                >
                  <div className="lg:col-span-4">
                    <h3 className="text-[15px] font-black text-slate-800 group-hover:text-[#E20074] transition-colors tracking-tight line-clamp-1">
                      {project.projectName}
                    </h3>
                  </div>

                  <div className="lg:col-span-3 flex items-center gap-2">
                    <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span className="text-[11px] font-bold text-slate-500 line-clamp-1">
                      {project.planner || <span className="text-slate-200 italic font-normal">k.A.</span>}
                    </span>
                  </div>

                  <div className="lg:col-span-2 flex flex-wrap gap-1">
                    {project.customerNumbers.length > 0 ? (
                      project.customerNumbers.slice(0, 2).map((num, i) => (
                        <button 
                          key={i} 
                          onClick={(e) => { e.stopPropagation(); handleCustomerClick(num); }}
                          className="px-2 py-0.5 bg-[#8CC63F]/10 text-[#547526] text-[10px] font-black rounded border border-[#8CC63F]/10 hover:bg-[#8CC63F] hover:text-white transition-colors"
                        >
                          {num}
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-200 text-[10px]">-</span>
                    )}
                    {project.customerNumbers.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-1 py-0.5 rounded">+{project.customerNumbers.length - 2}</span>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadge(project.status)}`}>
                      {project.status || 'In Prüfung'}
                    </span>
                  </div>

                  <div className="lg:col-span-1 text-right">
                    <span className="text-[10px] font-bold text-slate-300">
                      {project.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredProjects.length === 0 && (
              <div className="py-24 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 mt-4">
                <p className="text-slate-300 font-black text-lg uppercase tracking-widest">Keine Ergebnisse</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedVm(''); setSelectedStatus(''); }}
                  className="mt-4 text-[#E20074] text-xs font-bold underline"
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedProject && (
        <ProjectModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
          onCustomerClick={handleCustomerClick}
        />
      )}
    </div>
  );
};

export default App;
