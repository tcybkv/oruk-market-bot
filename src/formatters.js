const SITE_URL = process.env.SITE_URL || 'https://oruk-market.com';

// Звёздочки для рейтинга
function stars(rating) {
    const full = Math.round(Number(rating));
    return '⭐'.repeat(full) + '☆'.repeat(5 - full);
}

// Карточка товара (текст)
function formatProduct(product, index) {
    const vendor = product.vendors;
    const hasDiscount = product.old_price && product.old_price > product.price;
    const discount = hasDiscount
        ? Math.round((1 - product.price / product.old_price) * 100)
        : 0;

    let text = `*${index !== undefined ? `${index + 1}. ` : ''}${escMd(product.title)}*\n`;
    text += `💰 *${product.price.toLocaleString('ru-RU')} с.*`;

    if (hasDiscount) {
        text += ` ~${product.old_price.toLocaleString('ru-RU')} с.~ \\(\\-${discount}%\\)`;
    }

    text += `\n🏪 ${escMd(vendor?.name || 'Магазин')}`;
    return text;
}

// Детальная карточка товара
function formatProductDetail(product) {
    const vendor = product.vendors;
    const hasDiscount = product.old_price && product.old_price > product.price;
    const discount = hasDiscount
        ? Math.round((1 - product.price / product.old_price) * 100)
        : 0;

    let text = `*${escMd(product.title)}*\n\n`;

    text += `💰 *${product.price.toLocaleString('ru-RU')} с.*`;
    if (hasDiscount) {
        text += ` ~${product.old_price.toLocaleString('ru-RU')} с.~ \\(\\-${discount}%\\)`;
    }
    text += '\n\n';

    if (product.description) {
        text += `📝 ${escMd(product.description.substring(0, 300))}${product.description.length > 300 ? '\\.\\.\\.' : ''}\n\n`;
    }

    text += `📦 В наличии: ${product.stock_quantity > 0 ? product.stock_quantity + ' шт\\.' : 'нет'}\n`;
    text += `🏪 Магазин: *${escMd(vendor?.name || '—')}*\n`;
    text += `🗂 Категория: ${escMd(product.category || '—')}`;

    return text;
}

// Карточка продавца
function formatVendor(vendor, stats) {
    let text = `🏪 *${escMd(vendor.name)}*\n\n`;
    text += `📦 Товаров: *${stats.productCount}*\n`;

    if (stats.reviewCount > 0) {
        text += `⭐ Рейтинг: *${stats.avgRating}* \\(${stats.reviewCount} отзывов\\)\n`;
    } else {
        text += `⭐ Отзывов пока нет\n`;
    }

    const joinYear = new Date(vendor.created_at).getFullYear();
    text += `📅 На платформе с ${joinYear} года\n`;
    text += `\n🔗 [Открыть магазин на сайте](${SITE_URL}/vendor/${escMd(vendor.slug || vendor.id)})`;

    return text;
}

// Форматируем отзыв
function formatReview(review) {
    const date = new Date(review.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long'
    });
    return `${stars(review.rating)} *${escMd(review.user_name)}*\n_${escMd(review.comment)}_ — ${escMd(date)}`;
}

// Ссылка на товар
function productUrl(productId) {
    return `${SITE_URL}/product/${productId}`;
}

// Экранирование для MarkdownV2
function escMd(text) {
    if (!text) return '';
    return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

module.exports = {
    formatProduct,
    formatProductDetail,
    formatVendor,
    formatReview,
    productUrl,
    escMd,
    stars
};
