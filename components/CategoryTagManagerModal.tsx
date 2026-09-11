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
  Sparkles,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Gestion des Catégories & Étiquettes
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Personnalisez les dossiers et tags pour organiser vos tâches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              soundManager.playClickSound();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-[#F7C59F]/30 text-[#59240A] border border-[#F7C59F]/70 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#BA5316]" />
            <span>Catégories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 font-bold">
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tags');
              soundManager.playClickSound();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tags'
                ? 'bg-[#F7C59F]/30 text-[#59240A] border border-[#F7C59F]/70 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-[#BA5316]" />
            <span>Étiquettes / Tags</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 font-bold">
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
                  className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-[#F7C59F]/70 space-y-4 animate-in fade-in-50 duration-150 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {editingCategoryId ? 'Modifier la catégorie' : 'Nouvelle catégorie personnalisée'}
                    </h3>
                    {/* Live Preview Pill */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Aperçu :</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs"
                        style={{
                          backgroundColor: `${catColor}15`,
                          color: catColor,
                          borderColor: `${catColor}40`,
                        }}
                      >
                        <CategoryIcon name={catIcon} className="w-3.5 h-3.5" />
                        <span>{catName || 'Nom de la catégorie'}</span>
                      </span>
                    </div>
                  </div>

                  {categoryError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{categoryError}</span>
                    </div>
                  )}

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom de la catégorie <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Ex: Marketing, Famille, Sport, Clients..."
                      maxLength={40}
                      autoFocus
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]/50 focus:border-[#F7C59F]"
                    />
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
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
                          className={`w-7 h-7 rounded-xl transition-transform flex items-center justify-center shadow-2xs ${
                            catColor === preset.hex
                              ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
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
                          className="w-7 h-7 rounded-xl cursor-pointer border border-slate-200 p-0 overflow-hidden bg-transparent"
                          title="Couleur personnalisée"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Icon Selector Grid */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Icône représentative
                    </label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                      {AVAILABLE_CATEGORY_ICONS.map((iconItem) => {
                        const isSelected = catIcon === iconItem.name;
                        const IconComponent = iconItem.component;
                        return (
                          <button
                            key={iconItem.name}
                            type="button"
                            onClick={() => setCatIcon(iconItem.name)}
                            title={iconItem.label}
                            className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#F7C59F]/40 text-[#59240A] font-bold ring-1 ring-[#F7C59F]'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
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
                    >
                      Annuler
                    </Button>
                    <Button type="submit" size="sm" className="font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{editingCategoryId ? 'Enregistrer les modifications' : 'Créer la catégorie'}</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {categories.length} catégorie{categories.length > 1 ? 's' : ''} configurée{categories.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onResetDefaultCategories}
                      title="Restaurer les catégories standards"
                      className="text-xs text-slate-600 gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartAddCategory}
                      className="font-bold gap-1 shadow-2xs"
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
                  const isDeletingThis = deletingCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#F7C59F] transition-all flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                          style={{
                            backgroundColor: `${cat.color}18`,
                            color: cat.color,
                          }}
                        >
                          <CategoryIcon name={cat.iconName} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {cat.name}
                            </h4>
                            {cat.isDefault && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-semibold uppercase">
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#BA5316] hover:bg-slate-100 transition-colors"
                          title="Modifier la catégorie"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCatId(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
                <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs space-y-3 animate-in fade-in-50">
                  <div className="flex items-start gap-2 text-rose-900 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      Confirmer la suppression de la catégorie «{' '}
                      {categories.find((c) => c.id === deletingCatId)?.name} » ?
                    </span>
                  </div>
                  <p className="text-rose-700 text-[11px] leading-relaxed">
                    Les tâches associées ne seront pas supprimées. Elles seront automatiquement réassignées à la catégorie par défaut.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingCatId(null)}
                      className="bg-white"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleConfirmDeleteCategory(deletingCatId)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
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
                  className="bg-slate-50/90 rounded-2xl p-4 border border-[#F7C59F]/70 space-y-3 animate-in fade-in-50 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Ajouter une nouvelle étiquette
                    </h3>
                    {/* Live Preview */}
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border"
                      style={{
                        backgroundColor: `${newTagColor}18`,
                        color: newTagColor,
                        borderColor: `${newTagColor}40`,
                      }}
                    >
                      <Hash className="w-3 h-3" />
                      <span>{newTagName ? newTagName.toLowerCase().replace(/\s+/g, '-') : 'mon-tag'}</span>
                    </span>
                  </div>

                  {tagError && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
                      className="w-full sm:flex-1 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]/50 focus:border-[#F7C59F]"
                    />

                    {/* Color Presets */}
                    <div className="flex items-center gap-1 shrink-0">
                      {PRESET_TAG_COLORS.slice(0, 7).map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setNewTagColor(color.hex)}
                          className={`w-6 h-6 rounded-lg transition-transform ${
                            newTagColor === color.hex ? 'ring-2 ring-slate-800 scale-110' : 'opacity-80'
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
                    >
                      Annuler
                    </Button>
                    <Button type="submit" size="sm" className="font-bold">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Créer l’étiquette</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {tagStats.length} étiquette{tagStats.length > 1 ? 's' : ''} utilisée{tagStats.length > 1 ? 's' : ''}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsAddingTag(true);
                      setTagError('');
                    }}
                    className="font-bold gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Nouvelle étiquette</span>
                  </Button>
                </div>
              )}

              {/* Tags Catalog Grid */}
              {tagStats.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">Aucune étiquette pour le moment</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ajoutez des tags comme <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700 font-mono">#urgent</code> ou <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700 font-mono">#client</code> directement sur vos tâches.
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
                        className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-[#F7C59F] transition-all flex items-center justify-between gap-2 shadow-2xs"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editTagNewValue}
                              onChange={(e) => setEditTagNewValue(e.target.value)}
                              autoFocus
                              className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameTagSubmit(item.name)}
                              className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title="Valider"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTagName(null)}
                              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
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
                                  backgroundColor: style.bg,
                                  color: style.text,
                                  borderColor: style.border,
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
                                className="p-1 rounded-md text-slate-400 hover:text-[#BA5316] hover:bg-slate-100"
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
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
        <div className="px-5 py-3.5 sm:px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Toutes les modifications sont synchronisées automatiquement.</span>
          <Button size="sm" onClick={onClose} className="font-bold">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
