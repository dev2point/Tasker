'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Tag,
  FolderPlus,
  Check,
  RotateCcw,
  Layers,
  Palette,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { Category, Task, TagItem } from '@/types/task';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import {
  AVAILABLE_CATEGORY_ICONS,
  PRESET_CATEGORY_COLORS,
  PRESET_TAG_COLORS,
  CategoryIcon,
  getTagColor,
} from '@/components/CategoryIcon';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryTagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  tasks: Task[];
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string, fallbackCategoryId?: string) => void;
  onResetDefaultCategories: () => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteTag: (tagToDelete: string) => void;
  onAddCustomTag?: (newTag: string, color?: string) => void;
  initialTab?: 'categories' | 'tags';
}

export const CategoryTagManagerModal: React.FC<CategoryTagManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  tasks,
  onSaveCategory,
  onDeleteCategory,
  onResetDefaultCategories,
  onRenameTag,
  onDeleteTag,
  onAddCustomTag,
  initialTab = 'categories',
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>(initialTab);

  // Category Edit / Creation State
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState<string>('');
  const [catColor, setCatColor] = useState<string>('#3b82f6');
  const [catIcon, setCatIcon] = useState<string>('Folder');
  const [categoryError, setCategoryError] = useState<string>('');

  // Tag Management State
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>('#3b82f6');
  const [editingTagName, setEditingTagName] = useState<string | null>(null);
  const [editTagNewValue, setEditTagNewValue] = useState<string>('');
  const [tagError, setTagError] = useState<string>('');

  // Delete Category Confirmation State
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [fallbackCatId, setFallbackCatId] = useState<string>('travail');

  // Compute all unique tags and task counts
  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach((tag) => {
          const clean = tag.trim().toLowerCase();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([tag, count]) => ({ name: tag, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [tasks]);

  // Compute task count per category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  if (!isOpen) return null;

  // Handle open category create/edit form
  const handleStartAddCategory = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatColor(PRESET_CATEGORY_COLORS[0].hex);
    setCatIcon('Folder');
    setCategoryError('');
    setIsAddingCategory(true);
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.iconName || 'Folder');
    setCategoryError('');
    setIsAddingCategory(true);
  };

  const handleCancelCategoryForm = () => {
    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setCatName('');
    setCategoryError('');
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = catName.trim();
    if (!trimmed) {
      setCategoryError('Veuillez saisir un nom de catégorie.');
      return;
    }

    const id =
      editingCategoryId ||
      trimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ||
      'cat-' + Date.now();

    // Check duplicate ID if new
    if (!editingCategoryId && categories.some((c) => c.id === id)) {
      setCategoryError('Une catégorie avec un identifiant similaire existe déjà.');
      return;
    }

    const matchedPreset = PRESET_CATEGORY_COLORS.find((p) => p.hex === catColor);
    const bgLight = matchedPreset ? matchedPreset.bgLight : 'bg-slate-50 text-slate-700 border-slate-200';

    const categoryObj: Category = {
      id,
      name: trimmed,
      color: catColor,
      bgLight,
      iconName: catIcon,
      isDefault: false,
    };

    onSaveCategory(categoryObj);
    soundManager.playClickSound();
    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setCatName('');
    setCategoryError('');
  };

  // Confirm delete category
  const handleConfirmDeleteCategory = (catId: string) => {
    const target = categories.find((c) => c.id === catId);
    if (!target) return;

    const remaining = categories.filter((c) => c.id !== catId);
    const fallback = remaining.length > 0 ? remaining[0].id : 'travail';

    onDeleteCategory(catId, fallback);
    soundManager.playClickSound();
    setDeletingCatId(null);
  };

  // Handle Add Tag Submit
  const handleSaveTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagName.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');
    if (!clean) {
      setTagError('Veuillez saisir un nom pour l’étiquette.');
      return;
    }

    if (tagStats.some((t) => t.name === clean)) {
      setTagError('Cette étiquette existe déjà.');
      return;
    }

    if (onAddCustomTag) {
      onAddCustomTag(clean, newTagColor);
    }
    soundManager.playClickSound();
    setNewTagName('');
    setIsAddingTag(false);
    setTagError('');
  };

  // Handle Rename Tag Submit
  const handleRenameTagSubmit = (oldName: string) => {
    const cleanNew = editTagNewValue.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');
    if (!cleanNew) {
      setTagError('Le nom du tag ne peut pas être vide.');
      return;
    }

    if (cleanNew !== oldName) {
      onRenameTag(oldName, cleanNew);
      soundManager.playClickSound();
    }
    setEditingTagName(null);
    setEditTagNewValue('');
    setTagError('');
  };

  return (
    <div
      id="category-tag-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#061A13]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-500/30 text-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Gestion des Catégories & Étiquettes
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Personnalisez les dossiers et tags pour organiser vos tâches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-emerald-500/20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              soundManager.playClickSound();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/50 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-emerald-500/20'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Catégories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold">
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tags');
              soundManager.playClickSound();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/50 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-emerald-500/20'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Étiquettes / Tags</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold">
              {tagStats.length}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* ======================================================== */}
          {/* TAB 1: CATEGORIES */}
          {/* ======================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              {/* Category Create/Edit Form Container */}
              {isAddingCategory ? (
                <form
                  onSubmit={handleSaveCategorySubmit}
                  className="bg-emerald-950/40 rounded-2xl p-4 sm:p-5 border border-emerald-500/30 space-y-4 animate-in fade-in-50 duration-150 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      {editingCategoryId ? 'Modifier la catégorie' : 'Nouvelle catégorie personnalisée'}
                    </h3>
                    {/* Live Preview Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Aperçu :</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs"
                        style={{
                          backgroundColor: `${catColor}25`,
                          color: catColor,
                          borderColor: `${catColor}50`,
                        }}
                      >
                        <CategoryIcon name={catIcon} className="w-3.5 h-3.5" />
                        <span>{catName || 'Nom de la catégorie'}</span>
                      </span>
                    </div>
                  </div>

                  {categoryError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{categoryError}</span>
                    </div>
                  )}

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nom de la catégorie <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Ex: Marketing, Famille, Sport, Clients..."
                      maxLength={40}
                      autoFocus
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-emerald-500/30 bg-[#061A13] text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400"
                    />
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Couleur thématique</span>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">{catColor}</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {PRESET_CATEGORY_COLORS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setCatColor(preset.hex)}
                          title={preset.name}
                          className={`w-7 h-7 rounded-xl transition-transform flex items-center justify-center cursor-pointer shadow-xs ${
                            catColor === preset.hex
                              ? 'ring-2 ring-offset-2 ring-offset-[#061A13] ring-white scale-110'
                              : 'hover:scale-105 opacity-85 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                        >
                          {catColor === preset.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>
                      ))}
                      {/* Native Custom Color Picker */}
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          value={catColor}
                          onChange={(e) => setCatColor(e.target.value)}
                          className="w-7 h-7 rounded-xl cursor-pointer border border-emerald-500/30 p-0 overflow-hidden bg-transparent"
                          title="Couleur personnalisée"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Icon Selector Grid */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Icône représentative
                    </label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-[#061A13] rounded-xl border border-emerald-500/30">
                      {AVAILABLE_CATEGORY_ICONS.map((iconItem) => {
                        const isSelected = catIcon === iconItem.name;
                        const IconComponent = iconItem.component;
                        return (
                          <button
                            key={iconItem.name}
                            type="button"
                            onClick={() => setCatIcon(iconItem.name)}
                            title={iconItem.label}
                            className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/30 text-white font-bold ring-1 ring-emerald-400'
                                : 'text-slate-400 hover:text-white hover:bg-emerald-500/20'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelCategoryForm}
                      className="border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20"
                    >
                      Annuler
                    </Button>
                    <Button type="submit" size="sm" className="font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{editingCategoryId ? 'Enregistrer les modifications' : 'Créer la catégorie'}</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    {categories.length} catégorie{categories.length > 1 ? 's' : ''} configurée{categories.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onResetDefaultCategories}
                      title="Restaurer les catégories standards"
                      className="text-xs border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20 gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartAddCategory}
                      className="font-bold gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer border border-emerald-400/50"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Ajouter une catégorie</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Categories List Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((cat) => {
                  const taskCount = categoryStats[cat.id] || 0;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 hover:border-emerald-400/50 transition-all flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-emerald-500/20"
                          style={{
                            backgroundColor: `${cat.color}25`,
                            color: cat.color,
                          }}
                        >
                          <CategoryIcon name={cat.iconName} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate">
                              {cat.name}
                            </h4>
                            {cat.isDefault && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-semibold uppercase">
                                Défaut
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {taskCount} tâche{taskCount > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          title="Modifier la catégorie"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCatId(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Supprimer la catégorie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delete Category Confirmation Dialog */}
              {deletingCatId && (
                <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-xs space-y-3 animate-in fade-in-50">
                  <div className="flex items-start gap-2 text-rose-200 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      Confirmer la suppression de la catégorie «{' '}
                      {categories.find((c) => c.id === deletingCatId)?.name} » ?
                    </span>
                  </div>
                  <p className="text-rose-300 text-[11px] leading-relaxed">
                    Les tâches associées ne seront pas supprimées. Elles seront automatiquement réassignées à la catégorie par défaut.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingCatId(null)}
                      className="border-rose-500/30 text-rose-200 hover:bg-rose-900/50"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleConfirmDeleteCategory(deletingCatId)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                    >
                      Supprimer la catégorie
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: TAGS / ETIQUETTES */}
          {/* ======================================================== */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              {/* Add Tag Section */}
              {isAddingTag ? (
                <form
                  onSubmit={handleSaveTagSubmit}
                  className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-500/30 space-y-3 animate-in fade-in-50 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Ajouter une nouvelle étiquette
                    </h3>
                    {/* Live Preview */}
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border"
                      style={{
                        backgroundColor: `${newTagColor}25`,
                        color: newTagColor,
                        borderColor: `${newTagColor}50`,
                      }}
                    >
                      <Hash className="w-3 h-3" />
                      <span>{newTagName ? newTagName.toLowerCase().replace(/\s+/g, '-') : 'mon-tag'}</span>
                    </span>
                  </div>

                  {tagError && (
                    <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{tagError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nom du tag (ex: urgent, backend, sprint-2...)"
                      maxLength={30}
                      autoFocus
                      className="w-full sm:flex-1 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-emerald-500/30 bg-[#061A13] text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400/50"
                    />

                    {/* Color Presets */}
                    <div className="flex items-center gap-1 shrink-0">
                      {PRESET_TAG_COLORS.slice(0, 7).map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setNewTagColor(color.hex)}
                          className={`w-6 h-6 rounded-lg transition-transform cursor-pointer ${
                            newTagColor === color.hex ? 'ring-2 ring-white scale-110' : 'opacity-80'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingTag(false);
                        setNewTagName('');
                        setTagError('');
                      }}
                      className="border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20"
                    >
                      Annuler
                    </Button>
                    <Button type="submit" size="sm" className="font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Créer l’étiquette</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    {tagStats.length} étiquette{tagStats.length > 1 ? 's' : ''} utilisée{tagStats.length > 1 ? 's' : ''}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsAddingTag(true);
                      setTagError('');
                    }}
                    className="font-bold gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer border border-emerald-400/50"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Nouvelle étiquette</span>
                  </Button>
                </div>
              )}

              {/* Tags Catalog Grid */}
              {tagStats.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-950/20 text-slate-400 text-xs">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                  <p className="font-semibold text-slate-200">Aucune étiquette pour le moment</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ajoutez des tags comme <code className="bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.5 rounded text-emerald-300 font-mono">#urgent</code> ou <code className="bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.5 rounded text-emerald-300 font-mono">#client</code> directement sur vos tâches.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tagStats.map((item) => {
                    const style = getTagColor(item.name);
                    const isEditing = editingTagName === item.name;

                    return (
                      <div
                        key={item.name}
                        className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:border-emerald-400/50 transition-all flex items-center justify-between gap-2 shadow-xs"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editTagNewValue}
                              onChange={(e) => setEditTagNewValue(e.target.value)}
                              autoFocus
                              className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-[#061A13] text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameTagSubmit(item.name)}
                              className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20"
                              title="Valider"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTagName(null)}
                              className="p-1 rounded-lg text-slate-400 hover:bg-emerald-500/20"
                              title="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border"
                                style={{
                                  backgroundColor: `${style.bg}25`,
                                  color: style.text,
                                  borderColor: `${style.border}50`,
                                }}
                              >
                                <Hash className="w-3 h-3 opacity-70" />
                                <span>{item.name}</span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                ({item.count} tâche{item.count > 1 ? 's' : ''})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTagName(item.name);
                                  setEditTagNewValue(item.name);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-amber-300 hover:bg-emerald-500/20 cursor-pointer"
                                title="Renommer le tag (met à jour toutes les tâches)"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Supprimer l'étiquette #${item.name} de toutes les tâches associées ?`
                                    )
                                  ) {
                                    onDeleteTag(item.name);
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                                title="Supprimer ce tag de toutes les tâches"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-emerald-500/20 bg-emerald-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Toutes les modifications sont synchronisées automatiquement.</span>
          <Button size="sm" onClick={onClose} className="font-bold border-emerald-500/30 text-slate-200 hover:bg-emerald-500/20">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
