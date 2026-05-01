/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Upload, 
  Settings, 
  Moon, 
  Sun, 
  Copy, 
  Check, 
  MessageCircle, 
  LayoutGrid, 
  Save, 
  RotateCcw, 
  Download, 
  Trash2,
  TrendingUp,
  History,
  Info,
  ExternalLink,
  ChevronDown,
  X,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { cn } from './lib/utils';

// --- Types ---
type Days = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';
const DAYS_ORDER: Days[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

interface TogelYearData {
  [year: string]: string[][]; // Array of weeks, each week is 7 cells
}

interface TogelData {
  [market: string]: TogelYearData;
}

interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface MarketOption {
  value: string;
  label: string;
}

const MARKETS: MarketOption[] = [
  { value: 'HK', label: 'HONGKONG' },
  { value: 'SGP', label: 'SINGAPORE' },
  { value: 'SDY', label: 'SYDNEY' },
  { value: 'MC', label: 'MACAU' },
  { value: 'PCSO', label: 'PCSO' },
  { value: 'BULLSEYE', label: 'BULLSEYE' },
];

const YEARS = Array.from({ length: 2026 - 2009 + 1 }, (_, i) => (2009 + i).toString());

// --- Components ---

export default function App() {
  // State
  const [data, setData] = useState<TogelData>({});
  const [currentMarket, setCurrentMarket] = useState('HK');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [highlightMode, setHighlightMode] = useState<'none' | 'twins' | 'recurring' | 'frequency'>('none');
  const [showDonation, setShowDonation] = useState(false);
  const [showWA, setShowWA] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem('TOGEL_DATA');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local data", e);
      }
    }

    const savedHistory = localStorage.getItem('SEARCH_HISTORY');
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory).slice(0, 10));

    const savedTheme = localStorage.getItem('THEME');
    if (savedTheme) setDarkMode(savedTheme === 'dark');

    setIsAuthReady(true);
  }, []);

  // Save Data
  useEffect(() => {
    if (isAuthReady) {
      localStorage.setItem('TOGEL_DATA', JSON.stringify(data));
    }
  }, [data, isAuthReady]);

  // Save Theme
  useEffect(() => {
    localStorage.setItem('THEME', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auto WA Popup
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWA(true);
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Helpers
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const newData = { ...data };

      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        
        // Parse market and year from sheet name (e.g., "HK 19" -> HK 2019)
        const parts = sheetName.toUpperCase().split(/\s+/);
        let market = parts[0] || 'HK';
        let yearPart = parts[1] || '';
        
        let year = '';
        if (yearPart.length === 2) {
          year = (parseInt(yearPart) < 30 ? '20' : '19') + yearPart;
        } else if (yearPart.length === 4) {
          year = yearPart;
        } else {
          year = new Date().getFullYear().toString();
        }

        // Filter and map
        const results: string[] = [];
        rawJson.flat().forEach(cell => {
          let val = String(cell).trim();
          if (/^\d{2,4}$/.test(val)) {
            results.push(val);
          }
        });

        // Group into weeks (7 days)
        const weeks: string[][] = [];
        for (let i = 0; i < results.length; i += 7) {
          const week = results.slice(i, i + 7);
          while (week.length < 7) week.push("XXXX");
          weeks.push(week);
        }

        if (weeks.length > 0) {
          if (!newData[market]) newData[market] = {};
          newData[market][year] = weeks;
        }
      });

      setData(newData);
      alert("Data berhasil diimport!");
    };
    reader.readAsBinaryString(file);
  };

  const updateCell = (weekIdx: number, dayIdx: number, value: string) => {
    const newData = { ...data };
    if (!newData[currentMarket]) newData[currentMarket] = {};
    if (!newData[currentMarket][currentYear]) newData[currentMarket][currentYear] = [];
    
    // Ensure week exists
    while (newData[currentMarket][currentYear].length <= weekIdx) {
      newData[currentMarket][currentYear].push(["XXXX", "XXXX", "XXXX", "XXXX", "XXXX", "XXXX", "XXXX"]);
    }
    
    newData[currentMarket][currentYear][weekIdx][dayIdx] = value.trim() || "XXXX";
    setData(newData);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      const newHistory = [{ query: q, timestamp: Date.now() }, ...searchHistory.filter(h => h.query !== q)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('SEARCH_HISTORY', JSON.stringify(newHistory));
    }
  };

  const currentTableData = useMemo(() => {
    return data[currentMarket]?.[currentYear] || [];
  }, [data, currentMarket, currentYear]);

  // Analysis
  const frequencyMap = useMemo(() => {
    const map: Record<string, number> = {};
    currentTableData.flat().forEach(num => {
      if (num !== "XXXX") {
        map[num] = (map[num] || 0) + 1;
      }
    });
    return map;
  }, [currentTableData]);

  const stats = useMemo(() => {
    const sorted = Object.entries(frequencyMap).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    return sorted.slice(0, 10);
  }, [frequencyMap]);

  // Check highlights
  const getCellClass = (num: string) => {
    if (num === "XXXX") return "text-zinc-400 opacity-60";
    
    const highlights = [];
    
    if (searchQuery && num.includes(searchQuery)) {
      highlights.push("bg-yellow-300 text-black font-bold ring-1 ring-yellow-500 z-10");
    }

    if (highlightMode === 'twins') {
      const isTwin = num.length === 2 && num[0] === num[1] || 
                     num.length === 3 && (num[0] === num[1] || num[1] === num[2] || num[0] === num[2]) ||
                     num.length === 4 && (new Set(num.split('')).size < num.length);
      if (isTwin) highlights.push("bg-red-100 text-red-700 border border-red-200");
    }

    if (highlightMode === 'frequency' && frequencyMap[num] > 2) {
      highlights.push("bg-green-100 text-green-700 border border-green-200");
    }

    return highlights.join(' ');
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans",
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-[#f3f3f3] text-zinc-900"
    )}>
      {/* Audio Fix */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* Header */}
      <header className={cn(
        "z-40 px-5 py-3 flex items-center justify-between shadow-sm",
        darkMode ? "bg-zinc-900 border-b border-zinc-800" : "bg-[#217346] text-white"
      )}>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-black tracking-widest uppercase">
            DATA TOGEL MULTI PASARAN
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "p-1.5 rounded transition-all",
              darkMode ? "bg-zinc-800 text-yellow-400" : "bg-white/20 text-white"
            )}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={() => setShowDonation(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm",
              darkMode ? "bg-indigo-600 text-white" : "bg-[#ff5722] text-white"
            )}
          >
            💰 Donasi
          </button>
        </div>
      </header>

      {/* Control Bar */}
      <section className={cn(
        "px-5 py-2 border-b flex flex-wrap items-center gap-4 text-xs font-medium",
        darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-300"
      )}>
        <div className="flex items-center gap-2">
          <span className="opacity-60">Pasaran:</span>
          <select 
            value={currentMarket}
            onChange={(e) => setCurrentMarket(e.target.value)}
            className={cn(
              "px-2 py-1 rounded border outline-none focus:ring-1 focus:ring-green-500",
              darkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-300"
            )}
          >
            {MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="opacity-60">Tahun:</span>
          <select 
            value={currentYear}
            onChange={(e) => setCurrentYear(e.target.value)}
            className={cn(
              "px-2 py-1 rounded border outline-none focus:ring-1 focus:ring-green-500",
              darkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-300"
            )}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex-1 max-w-sm relative">
          <input 
            type="text"
            placeholder="Cari angka (2-4 digit)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={cn(
              "w-full pl-8 pr-10 py-1 rounded border outline-none focus:ring-1 focus:ring-green-500",
              darkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-300"
            )}
          />
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded border font-bold transition-all",
              darkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-300 hover:bg-zinc-50"
            )}
          >
            <Upload size={14} /> Import Excel
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </section>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table Column */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-20">
                <tr className={cn(
                  "border-b",
                  darkMode ? "bg-zinc-800 text-zinc-400" : "bg-[#f8f9fa] text-zinc-500"
                )}>
                  <th className="px-2 py-2 border w-10 text-center font-bold">#</th>
                  {DAYS_ORDER.map(day => (
                    <th key={day} className="px-4 py-2 border font-bold uppercase tracking-wider">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTableData.length > 0 ? (
                  currentTableData.map((week, weekIdx) => (
                    <tr key={weekIdx} className={cn(
                      "border-b transition-colors",
                      darkMode ? "border-zinc-800 hover:bg-zinc-800/50" : "border-zinc-200 hover:bg-zinc-50"
                    )}>
                      <td className={cn(
                        "px-2 py-2 border text-center font-bold opacity-40",
                        darkMode ? "bg-zinc-900" : "bg-[#f8f9fa]"
                      )}>
                        {weekIdx + 1}
                      </td>
                      {week.map((num, dayIdx) => (
                        <td key={dayIdx} className="p-0 border relative">
                          <input 
                            type="text"
                            value={num === "XXXX" ? "" : num}
                            placeholder="XXXX"
                            onChange={(e) => updateCell(weekIdx, dayIdx, e.target.value)}
                            onFocus={playSound}
                            className={cn(
                              "w-full h-full px-2 py-2 text-center font-mono text-sm outline-none transition-all cursor-pointer bg-transparent",
                              getCellClass(num)
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-20 text-center opacity-40">
                      Belum ada data untuk {currentMarket} {currentYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* Sidebar Column */}
        <aside className={cn(
          "w-64 border-l p-5 flex flex-col gap-6 overflow-y-auto hidden md:flex",
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
        )}>
          {/* Frequency Stat Card */}
          <div className={cn(
            "p-3 rounded border",
            darkMode ? "bg-zinc-800 border-zinc-700" : "bg-[#e6f0e9] border-[#c8e6c9]"
          )}>
            <div className={cn("text-[10px] font-bold uppercase mb-1", darkMode ? "text-zinc-500" : "text-[#2e7d32]")}>
              Angka Paling Sering
            </div>
            {stats[0] ? (
              <>
                <div className={cn("text-2xl font-black", darkMode ? "text-white" : "text-[#217346]")}>{stats[0][0]}</div>
                <div className="text-[11px] opacity-60 italic">Muncul {stats[0][1]} kali</div>
              </>
            ) : <div className="text-xs opacity-40">N/A</div>}
          </div>

          {/* Twins Stat Card */}
          <div className={cn(
            "p-3 rounded border",
            darkMode ? "bg-zinc-800 border-zinc-700" : "bg-[#fff3e0] border-[#ffe0b2]"
          )}>
            <div className={cn("text-[10px] font-bold uppercase mb-1", darkMode ? "text-zinc-500" : "text-[#e65100]")}>
              Angka Berpola
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setHighlightMode(highlightMode === 'twins' ? 'none' : 'twins')}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded border transition-all",
                  highlightMode === 'twins' ? "bg-red-500 text-white border-red-500" : "bg-white border-zinc-300 text-zinc-600"
                )}
              >
                KEMBAR
              </button>
              <button 
                onClick={() => setHighlightMode(highlightMode === 'frequency' ? 'none' : 'frequency')}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded border transition-all",
                  highlightMode === 'frequency' ? "bg-blue-500 text-white border-blue-500" : "bg-white border-zinc-300 text-zinc-600"
                )}
              >
                SERING
              </button>
            </div>
          </div>

          {/* Search History */}
          <div>
            <div className="text-[10px] font-black uppercase mb-2 opacity-50 tracking-widest">Riwayat Pencarian</div>
            <ul className="text-xs space-y-1.5">
              {searchHistory.map((h, i) => (
                <li key={i} className="flex items-center justify-between opacity-70 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-1 cursor-pointer hover:opacity-100" onClick={() => setSearchQuery(h.query)}>
                  <span>Cari: {h.query}</span>
                  <History size={10} />
                </li>
              ))}
              {searchHistory.length === 0 && <li className="opacity-30 italic">Belum ada riwayat</li>}
            </ul>
          </div>

          <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] opacity-30 text-center">
            App Version 2.5.0 (High Density)
          </div>
        </aside>
      </div>

      {/* Floating Buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <AnimatePresence>
          {showWA && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "p-4 rounded shadow-xl relative w-64 border",
                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              <button onClick={() => setShowWA(false)} className="absolute top-2 right-2 opacity-40">
                <X size={14} />
              </button>
              <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase text-[#25d366]">
                <div className="w-1.5 h-1.5 bg-[#25d366] rounded-full animate-pulse" />
                Admin Pola Jitu
              </div>
              <p className="text-[11px] leading-relaxed opacity-70 mb-3 italic">"Halo bosku! Ada yang perlu kami bantu hari ini?"</p>
              <a 
                href="https://wa.me/628385064581?text=hallo%20admin%20bantu%20saya" 
                target="_blank"
                rel="noreferrer"
                className="block text-center py-2 bg-[#25d366] text-white rounded text-[11px] font-black shadow-sm"
              >
                HUBUNGI WHATSAPP
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setShowWA(!showWA)}
          className="bg-[#25d366] text-white p-3.5 rounded-full shadow-lg transition-transform active:scale-90"
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Donation Modal */}
      <AnimatePresence>
        {showDonation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDonation(false)} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn(
              "relative w-full max-w-sm p-6 rounded-lg shadow-2xl overflow-hidden",
              darkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-zinc-100"
            )}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black italic text-red-600">Dukung Pengembangan</h3>
                <button onClick={() => setShowDonation(false)} className="opacity-40"><X size={20} /></button>
              </div>

              <p className="text-xs opacity-60 mb-6 italic leading-relaxed">
                 "Semoga JP bosku! Bantuan anda sangat berarti untuk server dan update aplikasi."
              </p>

              <div className="space-y-3">
                {[
                  { label: 'DANA', num: '087899804147' },
                  { label: 'BCA', num: '2941084780' }
                ].map(pay => (
                  <div key={pay.label} className={cn(
                    "p-3 rounded border flex items-center justify-between group",
                    darkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-200"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-[#217346]">{pay.label}</span>
                      <span className="font-mono text-sm font-bold">{pay.num}</span>
                      <span className="text-[9px] opacity-40 uppercase font-bold">Muhammad Hidayat</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(pay.num, pay.label)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold transition-all",
                        copyStatus === pay.label ? "bg-emerald-600 text-white" : "bg-[#217346] text-white"
                      )}
                    >
                      {copyStatus === pay.label ? 'BERHASIL' : 'SALIN'}
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full mt-6 py-2 border rounded text-xs font-bold opacity-50" onClick={() => setShowDonation(false)}>TUTUP</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
