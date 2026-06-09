import { Markup } from 'telegraf';

// Главное меню
export const mainMenu = Markup.keyboard([
    ['🛍 Каталог', '🔍 Поиск товаров'],
    ['🏪 Магазины', '📞 Поддержка'],
]).resize();

// Меню категорий (динамическое)
export const categoriesKeyboard = (categories) => {
    const rows = [];
    for (let i = 0; i < categories.length; i += 2) {
        const row = [categories[i].name];
        if (categories[i + 1]) row.push(categories[i + 1].name);
        rows.push(row);
    }
    rows.push(['⬅️ Главное меню']);
    return Markup.keyboard(rows).resize();
};

// Инлайн кнопки товара
export const productKeyboard = (productId, siteUrl) =>
    Markup.inlineKeyboard([
        [Markup.button.url('🛒 Купить на сайте', `${siteUrl}/product/${productId}`)],
        [Markup.button.callback('◀️ Назад к списку', 'back_to_list')],
    ]);

// Инлайн кнопки магазина
export const shopKeyboard = (vendorSlug, siteUrl) =>
    Markup.inlineKeyboard([
        [Markup.button.url('🏪 Открыть магазин', `${siteUrl}/shop/${vendorSlug}`)],
        [Markup.button.callback('📦 Товары этого магазина', `shop_products_${vendorSlug}`)],
        [Markup.button.callback('◀️ Назад к магазинам', 'back_to_shops')],
    ]);

// Пагинация
export const paginationKeyboard = (page, totalPages, prefix) => {
    const buttons = [];
    if (page > 0) buttons.push(Markup.button.callback('◀️', `${prefix}_page_${page - 1}`));
    buttons.push(Markup.button.callback(`${page + 1} / ${totalPages}`, 'noop'));
    if (page < totalPages - 1) buttons.push(Markup.button.callback('▶️', `${prefix}_page_${page + 1}`));
    return Markup.inlineKeyboard([buttons]);
};
