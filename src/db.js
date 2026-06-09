import { supabase } from './supabase.js';

const PER_PAGE = 8;

// Получить все категории
export const getCategories = async () => {
    const { data } = await supabase
        .from('categories')
        .select('id, name')
        .is('parent_id', null)
        .order('name');
    return data || [];
};

// Получить товары по категории с пагинацией
export const getProductsByCategory = async (categoryName, page = 0) => {
    const from = page * PER_PAGE;
    const to = from + PER_PAGE - 1;

    const { data, count } = await supabase
        .from('products')
        .select('id, title, price, old_price, images, stock_quantity, vendors(name, slug)', { count: 'exact' })
        .eq('category', categoryName)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

    return { products: data || [], total: count || 0, perPage: PER_PAGE };
};

// Поиск товаров
export const searchProducts = async (query, page = 0) => {
    const from = page * PER_PAGE;
    const to = from + PER_PAGE - 1;

    const { data, count } = await supabase
        .from('products')
        .select('id, title, price, old_price, images, stock_quantity, vendors(name, slug)', { count: 'exact' })
        .ilike('title', `%${query}%`)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

    return { products: data || [], total: count || 0, perPage: PER_PAGE };
};

// Получить один товар
export const getProduct = async (id) => {
    const { data } = await supabase
        .from('products')
        .select('*, vendors(name, slug, inn)')
        .eq('id', id)
        .single();
    return data;
};

// Получить все магазины
export const getVendors = async (page = 0) => {
    const from = page * PER_PAGE;
    const to = from + PER_PAGE - 1;

    const { data, count } = await supabase
        .from('vendors')
        .select('id, name, slug, inn', { count: 'exact' })
        .order('name')
        .range(from, to);

    // Считаем товары для каждого магазина
    const vendors = await Promise.all((data || []).map(async (v) => {
        const { count: productCount } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', v.id)
            .eq('is_active', true)
            .eq('status', 'approved');
        return { ...v, product_count: productCount || 0 };
    }));

    return { vendors, total: count || 0, perPage: PER_PAGE };
};

// Получить один магазин по slug
export const getVendorBySlug = async (slug) => {
    const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!data) return null;

    const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', data.id)
        .eq('is_active', true)
        .eq('status', 'approved');

    return { ...data, product_count: count || 0 };
};

// Получить товары магазина по slug
export const getVendorProducts = async (slug, page = 0) => {
    const vendor = await getVendorBySlug(slug);
    if (!vendor) return { products: [], total: 0, perPage: PER_PAGE };

    const from = page * PER_PAGE;
    const to = from + PER_PAGE - 1;

    const { data, count } = await supabase
        .from('products')
        .select('id, title, price, old_price, images, stock_quantity, vendors(name, slug)', { count: 'exact' })
        .eq('vendor_id', vendor.id)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

    return { products: data || [], total: count || 0, perPage: PER_PAGE };
};

export { PER_PAGE };
