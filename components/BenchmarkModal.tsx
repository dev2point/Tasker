'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Gauge,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Cpu,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
  Search,
  ArrowUpDown,
  FileCheck2,
  Database,
  BarChart3,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  runFullBenchmarkSuite,
  generateVolumetricDataset,
  formatBenchmarkReportMarkdown,
  BenchmarkSuiteResult,
} from '@/lib/benchmark-engine';
import { Task } from '@/types/task';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTasks: Task[];
  onInjectSandboxTasks?: (sandboxTasks: Task[]) => void;
  onRestoreRealTasks?: () => void;
  isSandboxActive?: boolean;
}

const VOLUME_PRESETS = [
  { value: 1000, label: '1 000', tag: 'Standard', desc: 'Usage quotidien fluide' },
  { value: 5000, label: '5 000', tag: 'Cabinet / Équipe', desc: 'Charge représentative multi-utilisateurs' },
  { value: 10000, label: '10 000', tag: 'Stress lourd', desc: 'Volume important avec historique fichiers' },
  { value: 25000, label: '25 000', tag: 'Stress extrême', desc: 'Test aux limites des collections mémoire' },
  { value: 50000, label: '50 000', tag: 'Volume maximal', desc: 'Capacité maximale navigateur' },
];

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  currentTasks,
  onInjectSandboxTasks,
  onRestoreRealTasks,
  isSandboxActive = false,
}) => {
  const [selectedVolume, setSelectedVolume] = useState<number>(5000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [result, setResult] = useState<BenchmarkSuiteResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'bench' | 'report' | 'sandbox'>('bench');

  // Live FPS and elapsed time monitor
  const [fps, setFps] = useState<number>(60);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const fpsFrameCountRef = useRef<number>(0);
  const fpsLastTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor FPS during run
  const startFpsMonitor = useCallback(() => {
    fpsFrameCountRef.current = 0;
    fpsLastTimeRef.current = performance.now();

    const loop = (time: number) => {
      fpsFrameCountRef.current++;
      const delta = time - fpsLastTimeRef.current;
      if (delta >= 500) {
        const currentFps = Math.round((fpsFrameCountRef.current * 1000) / delta);
        setFps(Math.min(120, Math.max(15, currentFps)));
        fpsFrameCountRef.current = 0;
        fpsLastTimeRef.current = time;
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const stopFpsMonitor = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopFpsMonitor();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [stopFpsMonitor]);

  if (!isOpen) return null;

  const handleStartBenchmark = async () => {
    setIsRunning(true);
    setProgressPercent(0);
    setCurrentPhase('Initialisation du banc d\'essai...');
    setElapsedSec(0);
    startFpsMonitor();

    const tStart = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedSec(parseFloat(((Date.now() - tStart) / 1000).toFixed(1)));
    }, 100);

    try {
      const benchResult = await runFullBenchmarkSuite(selectedVolume, (phase, pct) => {
        setCurrentPhase(phase);
        setProgressPercent(pct);
      });
      benchResult.fpsDuringRun = fps;
      setResult(benchResult);
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setIsRunning(false);
      stopFpsMonitor();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    const md = formatBenchmarkReportMarkdown(result);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadReport = () => {
    if (!result) return;
    const md = formatBenchmarkReportMarkdown(result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planit-benchmark-${result.volume}-tasks.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planit-benchmark-${result.volume}-metrics.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInjectSandbox = () => {
    if (!onInjectSandboxTasks) return;
    const sandboxTasks = generateVolumetricDataset(selectedVolume, {
      seed: 99,
      includeTrackedFiles: true,
      versionsPerFile: 3,
    });
    onInjectSandboxTasks(sandboxTasks);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'search':
        return <Search className="w-4 h-4 text-emerald-400" />;
      case 'sort':
        return <ArrowUpDown className="w-4 h-4 text-blue-400" />;
      case 'versioning':
        return <FileCheck2 className="w-4 h-4 text-purple-400" />;
      case 'mutation':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'memory':
        return <Database className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
      case 'A':
        return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
      case 'B':
        return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
      case 'C':
        return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
      default:
        return 'text-red-400 bg-red-500/15 border-red-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b1915] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-inner">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Banc d&apos;Essai & Montée en Charge
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-semibold">
                  Lab Volumétrique
                </span>
                {isSandboxActive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    Bac à sable actif
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200/70">
                Évaluation temps réel de la réactivité, du moteur de recherche, du tri et du versionnage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-950/20 border-b border-emerald-500/15">
          <button
            onClick={() => setActiveTab('bench')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bench'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-emerald-500/15'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Banc d&apos;essai interactif
          </button>
          <button
            onClick={() => setActiveTab('report')}
            disabled={!result}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'report'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : result
                ? 'text-slate-300 hover:text-white hover:bg-emerald-500/15'
                : 'text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Rapport complet & Export
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ml-auto ${
              activeTab === 'sandbox'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-amber-300 hover:bg-amber-500/15'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Bac à sable UI
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'bench' && (
            <>
              {/* Volume Selection Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/90 mb-2.5">
                  1. Sélectionner le volume d&apos;épreuve
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {VOLUME_PRESETS.map((p) => {
                    const isSelected = selectedVolume === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        disabled={isRunning}
                        onClick={() => setSelectedVolume(p.value)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                            : 'bg-emerald-950/30 border-emerald-500/20 hover:border-emerald-500/40 text-slate-300'
                        } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-base font-black ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                            {p.label}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {p.tag}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action & Run controls */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/25 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Banc complet : Recherche, Tri, Versionnage, Mutations & Mémoire
                    </div>
                    <div className="text-xs text-slate-400">
                      Exécution asynchrone par micro-tâches sans bloquer le rendu du navigateur
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    onClick={handleStartBenchmark}
                    disabled={isRunning}
                    className="flex-1 sm:flex-none h-10 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Banc en cours...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>Lancer le test ({selectedVolume.toLocaleString('fr-FR')} tâches)</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Running Status & Progress bar */}
              {isRunning && (
                <div className="p-5 rounded-xl bg-[#081512] border border-emerald-500/35 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{currentPhase}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{elapsedSec} s</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{fps} FPS</span>
                      </div>
                      <span className="font-bold text-emerald-300">{progressPercent}%</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Benchmark Results Display */}
              {result && !isRunning && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Hero Summary Badge */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#0a231b] to-emerald-950/60 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border font-black shadow-inner ${getGradeColor(
                          result.overallGrade
                        )}`}
                      >
                        <span className="text-3xl leading-none">{result.overallGrade}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-80">
                          Note UX
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-white">
                            Score de Performance : {result.overallScore}/100
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Conforme aux standards 60 FPS
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Test exécuté avec succès sur {result.volume.toLocaleString('fr-FR')} tâches complètes en{' '}
                          <span className="font-mono font-semibold text-emerald-300">{result.totalDurationMs} ms</span>.
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                          <span>CPU: {result.systemInfo.cores} cœurs</span>
                          {result.systemInfo.memoryEstimate && (
                            <span>Mémoire: {result.systemInfo.memoryEstimate}</span>
                          )}
                          <span>Horodatage: {new Date(result.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyReport}
                        className="text-xs border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 h-9 gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copié !' : 'Copier rapport'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadReport}
                        className="text-xs border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 h-9 gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exporter .md</span>
                      </Button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90 mb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Détail des 5 bancs de performance
                    </h4>
                    <div className="space-y-3">
                      {result.metrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                              {getCategoryIcon(metric.category)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white">{metric.name}</span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                                    metric.status === 'pass'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : metric.status === 'warning'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                                  }`}
                                >
                                  {metric.status === 'pass'
                                    ? 'Ultra rapide'
                                    : metric.status === 'warning'
                                    ? 'Acceptable'
                                    : 'Ralentissement'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                {metric.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-sans">Latence P95</span>
                              <span
                                className={`font-bold ${
                                  metric.p95Ms <= metric.targetThresholdMs
                                    ? 'text-emerald-300'
                                    : 'text-amber-300'
                                }`}
                              >
                                {metric.p95Ms} ms
                              </span>
                              <span className="text-[10px] text-slate-500 block font-sans">
                                seuil &lt; {metric.targetThresholdMs} ms
                              </span>
                            </div>

                            <div className="w-px h-8 bg-emerald-500/20" />

                            <div className="text-right min-w-[90px]">
                              <span className="text-[10px] text-slate-400 block font-sans">Cadence brute</span>
                              <span className="font-bold text-white">
                                {metric.opsPerSec.toLocaleString('fr-FR')} ops/s
                              </span>
                              <span className="text-[10px] text-emerald-400/80 block font-sans">
                                {metric.sampleCount} échantillon{metric.sampleCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab 2: Full Report & JSON Export */}
          {activeTab === 'report' && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">
                  Rapport technique d&apos;ingénierie (Markdown formaté)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyReport}
                    className="text-xs border-emerald-500/30 text-emerald-200 h-8 gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadReport}
                    className="text-xs border-emerald-500/30 text-emerald-200 h-8 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Markdown</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadJson}
                    className="text-xs border-cyan-500/30 text-cyan-200 h-8 gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Exporter JSON</span>
                  </Button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-emerald-500/25 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
                {formatBenchmarkReportMarkdown(result)}
              </pre>
            </div>
          )}

          {/* Tab 3: Interactive Sandbox Mode */}
          {activeTab === 'sandbox' && (
            <div className="p-5 rounded-2xl bg-[#081713] border border-amber-500/30 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Mode Bac à Sable Visuel (Injection In-App)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Injectez temporairement le jeu de données volumétrique sélectionné ({selectedVolume.toLocaleString('fr-FR')} tâches)
                    directement dans l&apos;interface principale (liste, kanban, calendrier) pour éprouver la fluidité utilisateur.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                  Isolation et protection intégrale de vos données réelles
                </div>
                <p>
                  Vos tâches et dossiers existants ({currentTasks.length} tâches réelles) sont sauvegardés en mémoire tampon.
                  Vous pouvez réinitialiser et restaurer vos données réelles à tout moment d&apos;un simple clic.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleInjectSandbox}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 h-10 rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Charger {selectedVolume.toLocaleString('fr-FR')} tâches dans l&apos;application</span>
                </Button>

                {isSandboxActive && onRestoreRealTasks && (
                  <Button
                    onClick={onRestoreRealTasks}
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold px-5 h-10 rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restaurer mes données réelles</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-emerald-500/20 bg-emerald-950/30 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Moteur Vitest & Studio de charge calibré pour collections intensives</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20"
          >
            Fermer
          </Button>
        </div>

      </div>
    </div>
  );
};
