import React from "react";
import { Shield, Key, Eye, HelpCircle, FileText, CheckCircle, Trash2, ArrowUpRight } from "lucide-react";

export default function DocumentationView() {
  return (
    <div id="security-documentation-workspace" className="space-y-6">
      
      {/* Policy intro banner */}
      <div id="intro-policy-banner" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row gap-5 items-center justify-between">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Standard Risk & Security protocols</span>
          <h3 className="text-lg font-bold tracking-tight">Security & Encryption Compliances</h3>
          <p className="text-xs text-slate-400 max-w-xl">MarketMinds is engineered on read-only manual setups journaling paradigms. We encrypt and store your logs with zero brokerage execution exposure.</p>
        </div>
        <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400">
          <Shield size={32} className="animate-pulse" />
        </div>
      </div>

      <div id="docs-details-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
        
        {/* AES 256 details */}
        <div id="doc-card-aes" className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase">
            <Key size={16} />
            <span>AES-256 Storage & Password Salts</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">Bespoke Data Security</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All database state sync payloads are protected under robust file system and transport permissions. Standard password credentials match secure string checks, preserving complete profile separation and isolated journal states.
          </p>
          <ul className="text-[11px] text-slate-500 space-y-1.5 pt-2">
            <li className="flex items-center gap-1.5"><CheckCircle size={10} className="text-emerald-400" /> Isolated user States via private profiles</li>
            <li className="flex items-center gap-1.5"><CheckCircle size={10} className="text-emerald-400" /> Database parameters validated on write operations</li>
            <li className="flex items-center gap-1.5"><CheckCircle size={10} className="text-emerald-400" /> Encrypted SSL tunnel routing</li>
          </ul>
        </div>

        {/* Read only access parameters */}
        <div id="doc-card-readonly" className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-mono font-bold text-xs uppercase">
            <Eye size={16} />
            <span>Read-Only Brokerage Safety</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">No Broker Connection Required</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unlike standard dangerous journal dashboards which demand API keys to your direct trading broker account or require withdrawal passwords, MarketMinds is **100% execution-free**. You remain in full control by entering setups manually.
          </p>
          <ul className="text-[11px] text-slate-500 space-y-1.5 pt-2">
            <li className="flex items-center gap-1.5"><CheckCircle size={10} className="text-blue-400" /> No direct hot wallet or brokerage keys</li>
            <li className="flex items-center gap-1.5"><CheckCircle size={10} className="text-blue-400" /> Zero direct loss liability exposure</li>
            <li className="flex items-center gap-1.5"><CheckCircle size={10} className="text-blue-400" /> 100% self-disciplined entry model</li>
          </ul>
        </div>

        {/* Export & Deletion rights */}
        <div id="doc-card-export-delete" className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-500 font-mono font-bold text-xs uppercase">
            <Trash2 size={16} />
            <span>Data Export & Immediate Deletion</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">Absolute Account Data Rights</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            MarketMinds strictly honors individual privacy guidelines. Users can instantly export their trading history as clean raw JSON records or select immediate account deletion to erase all trades, transaction ledgers, and community posts from servers permanently in 1 click.
          </p>
        </div>

        {/* Future Integrations roadmap */}
        <div id="doc-card-future" className="bg-slate-900 border border-slate-850 p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-mono font-bold text-xs uppercase">
            <ArrowUpRight size={16} />
            <span>Audit & Future Roadmap Modules</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">Growth-Ready Architecture</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Our multi-profile framework is constructed to integrate seamless enhancements including public performance leaderboard expansions, backtesting and strategy replays, community newsfeeds, and custom checklist triggers.
          </p>
        </div>

      </div>

    </div>
  );
}
