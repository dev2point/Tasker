'use client';

import React, { useState } from 'react';
import { Department, DossierPriority, ReviewDossier, WorkflowActor } from '@/types/review';
import { X, Plus, FileText, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { soundManager } from '@/lib/sound';

interface NewDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkflowActor;
  onCreateDossier: (newDossier: ReviewDossier) => void;
}

const TYPOLOGIES_PER_DEPT: Record<Department, string[]> = {
  Fiscalité: [
    'Liasse Fiscale & CVAE',
    'Crédit Impôt Recherche & CIR',
    'Intégration Fiscale & Restructuration',
    'Audit & Déclaration TVA',
    'Prix de Transfert & Rescrit',
  ],
  Comptabilité: [
    'Consolidation & Arrêté des Comptes',
    'Clôture Bilan & Liasse Annuelle',
    'Audit de Trésorerie & Covenants',
    'Révision des Provisions & IFRS',
  ],
  Juridique: [
    'Opération de Haut de Bilan & Pacte d’Actionnaires',
    'Cession de Titres & GAP',
    'Secrétariat Juridique Annuel & PV d’AG',
    'Contrats Commerciaux & CGV',
    'Fusion-Absorption & Apport Partiel d’Actif',
  ],
};

export const NewDossierModal: React.FC<NewDossierModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateDossier,
}) => {
  const [department, setDepartment] = useState<Department>(
    (currentUser.department as Department) || 'Fiscalité'
  );
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSiret, setClientSiret] = useState('');
  const [typology, setTypology] = useState(TYPOLOGIES_PER_DEPT[department][0]);
  const [priority, setPriority] = useState<DossierPriority>('medium');
  const [estimatedDate, setEstimatedDate] = useState(() =>
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [metricLabel, setMetricLabel] = useState("Chiffre d'Affaires");
  const [metricAmount, setMetricAmount] = useState<number>(1500000);
  const [initialDraft, setInitialDraft] = useState(
    `1. Exposé des motifs
Le présent dossier a été préparé en conformité avec les diligences professionnelles requises.

2. Données clés
Les états financiers et pièces justificatives ont été collectés.

3. Recommandations
À soumettre au superviseur pour examen contradictoire.`
  );

  const handleDeptChange = (newDept: Department) => {
    setDepartment(newDept);
    setTypology(TYPOLOGIES_PER_DEPT[newDept][0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) return;
    soundManager.playClickSound();

    const now = new Date().toISOString();
    const deptPrefix =
      department === 'Fiscalité' ? 'FIS' : department === 'Comptabilité' ? 'CPT' : 'JUR';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const ref = `DOS-${new Date().getFullYear()}-${deptPrefix}-${randomNum}`;

    const newDossier: ReviewDossier = {
      id: `dossier-${Date.now()}`,
      ref,
      title: title.trim(),
      clientName: clientName.trim(),
      clientSiret: clientSiret.trim() || undefined,
      department,
      typology,
      priority,
      status: 'brouillon',
      maker: currentUser,
      lock: {
        isLocked: false,
      },
      estimatedDeliverableDate: estimatedDate,
      createdAt: now,
      updatedAt: now,
      dataFields: [
        {
          id: `df-${Date.now()}-1`,
          label: metricLabel || "Montant d'opération",
          category: department === 'Fiscalité' ? 'fiscal' : department === 'Comptabilité' ? 'finance' : 'juridique',
          previousValue: metricAmount,
          currentValue: metricAmount,
          unit: '€',
          notes: 'Valeur déclarée au stade brouillon',
        },
      ],
      textDocument: {
        documentId: `doc-${Date.now()}`,
        title: `Projet de synthèse - ${title.trim()}`,
        type:
          department === 'Fiscalité'
            ? 'conclusions_fiscales'
            : department === 'Comptabilité'
              ? 'rapport_cloture'
              : 'acte_juridique',
        previousContent: initialDraft,
        currentContent: initialDraft,
        lastAmendedBy: currentUser.name,
        lastAmendedAt: now,
        amendmentNotes: 'Création initiale du projet',
      },
      interDepRequests: [],
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorDepartment: currentUser.department,
          actorRole: currentUser.role,
          ipAddress: '192.168.1.42',
          action: 'creation',
          details: `Création du dossier "${title.trim()}" pour ${clientName.trim()} par le collaborateur.`,
        },
      ],
    };

    onCreateDossier(newDossier);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#EE8D4B]" />
            <h3 className="text-base font-bold">Nouveau Dossier Métier &amp; Circuit de Revue</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {/* Department Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Département Référent</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Fiscalité', 'Comptabilité', 'Juridique'] as Department[]).map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => handleDeptChange(dept)}
                  className={`py-2 px-3 rounded-xl font-bold border text-center transition-all ${
                    department === dept
                      ? dept === 'Fiscalité'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-300'
                        : dept === 'Comptabilité'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300'
                          : 'bg-blue-100 border-blue-400 text-blue-950 ring-2 ring-blue-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Titre du Dossier</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Liasse Fiscale & CVAE 2025..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nom du Client</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: SAS Biopharma..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Typologie</label>
              <select
                value={typology}
                onChange={(e) => setTypology(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
              >
                {TYPOLOGIES_PER_DEPT[department].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DossierPriority)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
              >
                <option value="low">Basse</option>
                <option value="medium">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Échéance Estimée</label>
              <input
                type="date"
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
              />
            </div>
          </div>

          {/* Metric input */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-2">
              Indicateur Chiffré Initial (pour suivi du Diff financier)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1">Libellé de l&apos;Indicateur</label>
                <input
                  type="text"
                  value={metricLabel}
                  onChange={(e) => setMetricLabel(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Montant initial (€)</label>
                <input
                  type="number"
                  value={metricAmount}
                  onChange={(e) => setMetricAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {/* Initial Draft */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Projet d&apos;Acte ou Note de Synthèse Initiale (pour Diff Textuel)
            </label>
            <textarea
              value={initialDraft}
              onChange={(e) => setInitialDraft(e.target.value)}
              rows={4}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#BA5316] hover:bg-[#933F15] text-white font-bold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Créer le Dossier (Brouillon)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
