import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { categories, tasks } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Category } from '@/types/task';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

export async function GET() {
  const db = getDrizzleDb();

  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({
      source: 'offline_mode',
      categories: DEFAULT_CATEGORIES,
      message: 'PostgreSQL non connecté. Catégories gérées en local via IndexedDB.',
    });
  }

  try {
    await ensureDatabaseTables();
    const rows = await db.select().from(categories);

    if (rows.length === 0) {
      // Seed default categories if table is empty
      for (const cat of DEFAULT_CATEGORIES) {
        await db.insert(categories).values({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          bgLight: cat.bgLight,
          iconName: cat.iconName,
          isDefault: true,
          createdAt: new Date(),
        }).onConflictDoNothing();
      }

      return NextResponse.json({
        source: 'postgresql_supabase',
        categories: DEFAULT_CATEGORIES,
      });
    }

    const formatted: Category[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      bgLight: r.bgLight,
      iconName: r.iconName,
      isDefault: r.isDefault,
    }));

    return NextResponse.json({
      source: 'postgresql_supabase',
      categories: formatted,
    });
  } catch (error) {
    console.warn('PostgreSQL categories fetch failed, falling back to defaults:', error);
    return NextResponse.json({
      source: 'offline_mode',
      categories: DEFAULT_CATEGORIES,
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
}

export async function POST(req: NextRequest) {
  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json(
      { message: 'Database not connected, category saved locally' },
      { status: 200 }
    );
  }

  try {
    await ensureDatabaseTables();
    const catData: Category = await req.json();

    await db
      .insert(categories)
      .values({
        id: catData.id,
        name: catData.name,
        color: catData.color,
        bgLight: catData.bgLight || 'bg-slate-50 text-slate-700 border-slate-200',
        iconName: catData.iconName || 'Tag',
        isDefault: Boolean(catData.isDefault),
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: categories.id,
        set: {
          name: catData.name,
          color: catData.color,
          bgLight: catData.bgLight || 'bg-slate-50 text-slate-700 border-slate-200',
          iconName: catData.iconName || 'Tag',
          isDefault: Boolean(catData.isDefault),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving category to PostgreSQL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const fallbackCategoryId = searchParams.get('fallback') || 'travail';

    if (!id) {
      return NextResponse.json({ error: 'Missing category id' }, { status: 400 });
    }

    // Reassign tasks with this category to fallback category before deletion
    await db.update(tasks).set({ category: fallbackCategoryId }).where(eq(tasks.category, id));

    // Delete category
    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
