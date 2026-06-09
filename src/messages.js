// Форматирование сообщений

export const formatProduct = (p) => {
    const price = p.old_price
        ? `~${p.old_price.toLocaleString()}~ → *${p.price.toLocaleString()} сом*`
        : `*${p.price.toLocaleString()} сом*`;

    const stock = p.stock_quantity > 0
        ? `✅ В наличии (${p.stock_quantity} шт.)`
        : `❌ Нет в наличии`;

    return [
        `*${escMd(p.title)}*`,
        ``,
        `💰 ${price}`,
        `📦 ${stock}`,
        p.description ? `\n📝 ${escMd(p.description.slice(0, 150))}${p.description.length > 150 ? '\\.\\.\\.' : ''}` : '',
        p.vendors?.name ? `\n🏪 Магазин: [${escMd(p.vendors.name)}](${process.env.SITE_URL}/shop/${p.vendors.slug})` : '',
    ].filter(Boolean).join('\n');
};

export const formatVendor = (v) => {
    return [
        `🏪 *${escMd(v.name)}*`,
        ``,
        `📦 Товаров: ${v.product_count || 0}`,
        v.inn ? `🪪 ИНН: ${escMd(v.inn)}` : '',
    ].filter(Boolean).join('\n');
};

export const formatProductList = (products, page, total, perPage) => {
    if (products.length === 0) return '😔 Ничего не найдено\\.';

    const lines = products.map((p, i) => {
        const num = page * perPage + i + 1;
        const price = `${p.price.toLocaleString()} сом`;
        return `${num}\\. [${escMd(p.title)}](${process.env.SITE_URL}/product/${p.id}) — ${price}`;
    });

    return [
        `Найдено товаров: *${total}*`,
        `Страница ${page + 1} из ${Math.ceil(total / perPage)}`,
        ``,
        ...lines,
        ``,
        `👆 Нажми на название чтобы открыть товар`
    ].join('\n');
};

// Экранирование спецсимволов MarkdownV2
export const escMd = (text = '') =>
    String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
