export const formatProduct = (p) => {
    const price = p.old_price
        ? `~${p.old_price.toLocaleString()}~ → *${p.price.toLocaleString()} сом*`
        : `*${p.price.toLocaleString()} сом*`;

    const stock = p.stock_quantity > 0
        ? `✅ В наличии \\(${p.stock_quantity} шт\\.\\)`
        : `❌ Нет в наличии`;

    return [
        `🛍 *${escMd(p.title)}*`,
        ``,
        `💰 ${price}`,
        `📦 ${stock}`,
        p.description
            ? `\n📝 ${escMd(p.description.slice(0, 200))}${p.description.length > 200 ? '\\.\\.\\.' : ''}`
            : '',
        p.vendors?.name
            ? `\n🏪 [${escMd(p.vendors.name)}](${process.env.SITE_URL}/shop/${p.vendors.slug})`
            : '',
    ].filter(Boolean).join('\n');
};

export const formatVendor = (v) => {
    return [
        `🏪 *${escMd(v.name)}*`,
        ``,
        `📦 Товаров: *${v.product_count || 0}*`,
        v.inn ? `🪪 ИНН: ${escMd(v.inn)}` : '',
        ``,
        `🔗 [Открыть магазин на сайте](${process.env.SITE_URL}/shop/${escMd(v.slug)})`,
    ].filter(Boolean).join('\n');
};

export const formatProductList = (products, page, total, perPage) => {
    if (products.length === 0) return '😔 Ничего не найдено\\.';

    const lines = products.map((p, i) => {
        const num = page * perPage + i + 1;
        const price = `${p.price.toLocaleString()} сом`;
        const title = escMd(p.title.slice(0, 40));
        return `${num}\\. *${title}* — ${price}`;
    });

    return [
        `📋 Найдено: *${total}* | Стр\\. ${page + 1}/${Math.ceil(total / perPage)}`,
        ``,
        ...lines,
        ``,
        `👇 Нажми кнопку ниже чтобы открыть товар`,
    ].join('\n');
};

export const escMd = (text = '') =>
    String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');