import 'dotenv/config';
import { Telegraf, session, Markup } from 'telegraf';
import {
    getCategories, getProductsByCategory, searchProducts,
    getProduct, getVendors, getVendorBySlug, getVendorProducts, PER_PAGE
} from './db.js';
import {
    mainMenu, categoriesKeyboard, productKeyboard,
    shopKeyboard
} from './keyboards.js';
import { formatProduct, formatVendor, formatProductList, escMd } from './messages.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session({ defaultSession: () => ({ state: null, query: null, category: null, shopSlug: null }) }));

// ─────────────────────────────────────────────
// СТАРТ
// ─────────────────────────────────────────────
bot.start(async (ctx) => {
    const payload = ctx.startPayload;
    ctx.session = { state: null, query: null, category: null, shopSlug: null };

    // Пришёл по ссылке магазина: t.me/botname?start=shop_my-store
    if (payload && payload.startsWith('shop_')) {
        const slug = payload.replace('shop_', '');
        ctx.session.shopSlug = slug;
        ctx.session.state = 'shop_mode';
        await sendShopWelcome(ctx, slug);
        return;
    }

    // Обычный старт
    await ctx.replyWithPhoto(
        { url: `${process.env.SITE_URL}/og-image.png` },
        {
            caption:
                `👋 Привет\\! Добро пожаловать в *Oruk Market*\n\n` +
                `🛍 Маркетплейс Кыргызстана — товары от проверенных продавцов\\.\n\n` +
                `Выберите действие:`,
            parse_mode: 'MarkdownV2',
            ...mainMenu
        }
    ).catch(() =>
        ctx.reply(
            `👋 Привет\\! Добро пожаловать в *Oruk Market* — маркетплейс Кыргызстана\\.\n\nВыберите действие:`,
            { parse_mode: 'MarkdownV2', ...mainMenu }
        )
    );
});

bot.help(async (ctx) => {
    await ctx.reply(
        `*Oruk Market Bot*\n\n` +
        `🛍 *Каталог* — просмотр товаров по категориям\n` +
        `🔍 *Поиск* — найти конкретный товар\n` +
        `🏪 *Магазины* — список продавцов\n` +
        `📞 *Поддержка* — связь с администратором\n\n` +
        `🌐 Сайт: [oruk\\.market](${escMd(process.env.SITE_URL)})`,
        { parse_mode: 'MarkdownV2', ...mainMenu }
    );
});

// ─────────────────────────────────────────────
// КАТАЛОГ
// ─────────────────────────────────────────────
bot.hears('🛍 Каталог', async (ctx) => {
    ctx.session.state = 'catalog';
    const categories = await getCategories();
    if (categories.length === 0) {
        return ctx.reply('😔 Категории пока не добавлены\\.', { parse_mode: 'MarkdownV2', ...mainMenu });
    }
    await ctx.reply('📂 *Выберите категорию:*', { parse_mode: 'MarkdownV2', ...categoriesKeyboard(categories) });
});

// ─────────────────────────────────────────────
// ПОИСК
// ─────────────────────────────────────────────
bot.hears('🔍 Поиск товаров', async (ctx) => {
    ctx.session.state = 'awaiting_search';
    await ctx.reply('🔍 Введите название товара для поиска:', Markup.keyboard([['⬅️ Главное меню']]).resize());
});

// ─────────────────────────────────────────────
// МАГАЗИНЫ
// ─────────────────────────────────────────────
bot.hears('🏪 Магазины', async (ctx) => {
    ctx.session.state = 'shops';
    await sendVendorsList(ctx, 0);
});

// ─────────────────────────────────────────────
// ПОДДЕРЖКА
// ─────────────────────────────────────────────
bot.hears('📞 Поддержка', async (ctx) => {
    await ctx.reply(
        `📞 *Поддержка Oruk Market*\n\n` +
        `По любым вопросам обращайтесь:\n` +
        `👤 Администратор: @${escMd(process.env.SUPPORT_USERNAME || 'orukmarket')}\n\n` +
        `Мы ответим в течение рабочего дня\\.`,
        { parse_mode: 'MarkdownV2', ...mainMenu }
    );
});

// ─────────────────────────────────────────────
// SHOP MODE — кнопки внутри режима магазина
// ─────────────────────────────────────────────
bot.hears('📦 Товары магазина', async (ctx) => {
    if (ctx.session.shopSlug) {
        await sendShopProducts(ctx, ctx.session.shopSlug, 0);
    }
});

bot.hears('🛍 Все магазины', async (ctx) => {
    ctx.session.state = 'shops';
    await sendVendorsList(ctx, 0);
});

// ─────────────────────────────────────────────
// ГЛАВНОЕ МЕНЮ
// ─────────────────────────────────────────────
bot.hears('⬅️ Главное меню', async (ctx) => {
    ctx.session = { state: null, query: null, category: null, shopSlug: null };
    await ctx.reply(
        `👋 Добро пожаловать в *Oruk Market*\\!\n\nВыберите действие:`,
        { parse_mode: 'MarkdownV2', ...mainMenu }
    );
});

// ─────────────────────────────────────────────
// ТЕКСТОВЫЕ СООБЩЕНИЯ
// ─────────────────────────────────────────────
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const state = ctx.session.state;

    // Поиск внутри магазина
    if (state === 'shop_search') {
        ctx.session.query = text;
        ctx.session.state = 'shop_mode';
        await sendSearchResults(ctx, text, 0);
        return;
    }

    // Поиск глобальный
    if (state === 'awaiting_search') {
        ctx.session.query = text;
        ctx.session.state = 'search_results';
        await sendSearchResults(ctx, text, 0);
        return;
    }

    // Выбор категории
    if (state === 'catalog') {
        ctx.session.category = text;
        ctx.session.state = 'category_products';
        await sendCategoryProducts(ctx, text, 0);
        return;
    }

    await ctx.reply('Выберите действие из меню:', mainMenu);
});

// ─────────────────────────────────────────────
// ИНЛАЙН КНОПКИ
// ─────────────────────────────────────────────
bot.action(/^search_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await sendSearchResults(ctx, ctx.session.query, page, true);
});

bot.action(/^cat_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await sendCategoryProducts(ctx, ctx.session.category, page, true);
});

bot.action(/^shops_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await sendVendorsList(ctx, page, true);
});

bot.action(/^product_(.+)$/, async (ctx) => {
    const productId = ctx.match[1];
    await ctx.answerCbQuery();
    await sendProductCard(ctx, productId);
});

bot.action(/^shop_products_(.+)$/, async (ctx) => {
    const slug = ctx.match[1];
    ctx.session.shopSlug = slug;
    await ctx.answerCbQuery();
    await sendShopProducts(ctx, slug, 0, true);
});

bot.action(/^shop_(.+)$/, async (ctx) => {
    const slug = ctx.match[1];
    await ctx.answerCbQuery();
    await sendShopCard(ctx, slug);
});

bot.action(/^shopcat_page_(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await sendShopProducts(ctx, ctx.session.shopSlug, page, true);
});

bot.action('back_to_list', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.session.state === 'category_products') {
        await sendCategoryProducts(ctx, ctx.session.category, 0, true);
    } else {
        await sendSearchResults(ctx, ctx.session.query, 0, true);
    }
});

bot.action('back_to_shops', async (ctx) => {
    await ctx.answerCbQuery();
    await sendVendorsList(ctx, 0, true);
});

bot.action('noop', (ctx) => ctx.answerCbQuery());

// ─────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ─────────────────────────────────────────────

async function sendShopWelcome(ctx, slug) {
    const vendor = await getVendorBySlug(slug);
    if (!vendor) {
        return ctx.reply('😔 Магазин не найден\\.', { parse_mode: 'MarkdownV2', ...mainMenu });
    }

    const shopMenu = Markup.keyboard([
        ['📦 Товары магазина', '🔍 Поиск товаров'],
        ['🛍 Все магазины', '📞 Поддержка'],
        ['⬅️ Главное меню']
    ]).resize();

    const text =
        `🏪 *${escMd(vendor.name)}*\n\n` +
        `Вы зашли через страницу этого магазина\\.\n` +
        `📦 Товаров в наличии: *${vendor.product_count}*\n\n` +
        `👇 Смотрите товары ниже:`;

    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...shopMenu });
    await sendShopProducts(ctx, slug, 0);
}

async function sendSearchResults(ctx, query, page, edit = false) {
    if (!query) return;
    const { products, total, perPage } = await searchProducts(query, page);
    const totalPages = Math.ceil(total / perPage);

    const text = [
        `🔍 *Поиск: "${escMd(query)}"*`,
        ``,
        formatProductList(products, page, total, perPage),
    ].join('\n');

    const productButtons = products.map(p =>
        [Markup.button.callback(
            `${p.title.slice(0, 35)}${p.title.length > 35 ? '…' : ''} — ${p.price.toLocaleString()} с.`,
            `product_${p.id}`
        )]
    );

    const navRow = buildNavRow(page, totalPages, 'search');
    const keyboard = Markup.inlineKeyboard([...productButtons, ...(navRow ? [navRow] : [])]);

    const opts = { parse_mode: 'MarkdownV2', ...keyboard };
    if (edit) {
        await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
    } else {
        await ctx.reply(text, opts);
    }
}

async function sendCategoryProducts(ctx, category, page, edit = false) {
    const { products, total, perPage } = await getProductsByCategory(category, page);
    const totalPages = Math.ceil(total / perPage);

    const text = [
        `📂 *${escMd(category)}*`,
        ``,
        formatProductList(products, page, total, perPage),
    ].join('\n');

    const productButtons = products.map(p =>
        [Markup.button.callback(
            `${p.title.slice(0, 35)}${p.title.length > 35 ? '…' : ''} — ${p.price.toLocaleString()} с.`,
            `product_${p.id}`
        )]
    );

    const navRow = buildNavRow(page, totalPages, 'cat');
    const keyboard = Markup.inlineKeyboard([...productButtons, ...(navRow ? [navRow] : [])]);

    const opts = { parse_mode: 'MarkdownV2', ...keyboard };
    if (edit) {
        await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
    } else {
        await ctx.reply(text, opts);
    }
}

async function sendProductCard(ctx, productId) {
    const product = await getProduct(productId);
    if (!product) {
        return ctx.answerCbQuery('Товар не найден', { show_alert: true });
    }

    const text = formatProduct(product);
    const keyboard = productKeyboard(productId, process.env.SITE_URL);

    if (product.images && product.images.length > 0) {
        await ctx.replyWithPhoto(product.images[0], {
            caption: text,
            parse_mode: 'MarkdownV2',
            ...keyboard
        }).catch(() => ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard }));
    } else {
        await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
    }
}

async function sendVendorsList(ctx, page, edit = false) {
    const { vendors, total, perPage } = await getVendors(page);
    const totalPages = Math.ceil(total / perPage);

    if (vendors.length === 0) {
        return ctx.reply('😔 Магазинов пока нет\\.', { parse_mode: 'MarkdownV2', ...mainMenu });
    }

    const lines = vendors.map((v, i) =>
        `${page * perPage + i + 1}\\. *${escMd(v.name)}* — ${v.product_count} тов\\.`
    );

    const text = [
        `🏪 *Магазины Oruk Market*`,
        `Всего: ${total}`,
        ``,
        ...lines,
    ].join('\n');

    const shopButtons = vendors.map(v =>
        [Markup.button.callback(`🏪 ${v.name}`, `shop_${v.slug}`)]
    );

    const navRow = buildNavRow(page, totalPages, 'shops');
    const keyboard = Markup.inlineKeyboard([...shopButtons, ...(navRow ? [navRow] : [])]);

    const opts = { parse_mode: 'MarkdownV2', ...keyboard };
    if (edit) {
        await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
    } else {
        await ctx.reply(text, opts);
    }
}

async function sendShopCard(ctx, slug) {
    const vendor = await getVendorBySlug(slug);
    if (!vendor) {
        return ctx.answerCbQuery('Магазин не найден', { show_alert: true });
    }

    const text = formatVendor(vendor);
    const keyboard = shopKeyboard(slug, process.env.SITE_URL);
    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
}

async function sendShopProducts(ctx, slug, page, edit = false) {
    const { products, total, perPage } = await getVendorProducts(slug, page);
    const totalPages = Math.ceil(total / perPage);

    const vendor = await getVendorBySlug(slug);
    const shopName = vendor?.name || slug;

    const text = [
        `🏪 *${escMd(shopName)}* — товары`,
        ``,
        formatProductList(products, page, total, perPage),
    ].join('\n');

    const productButtons = products.map(p =>
        [Markup.button.callback(
            `${p.title.slice(0, 35)}${p.title.length > 35 ? '…' : ''} — ${p.price.toLocaleString()} с.`,
            `product_${p.id}`
        )]
    );

    const navRow = buildNavRow(page, totalPages, 'shopcat');
    const backBtn = [Markup.button.callback('◀️ Назад к магазину', `shop_${slug}`)];
    const keyboard = Markup.inlineKeyboard([...productButtons, ...(navRow ? [navRow] : []), backBtn]);

    const opts = { parse_mode: 'MarkdownV2', ...keyboard };
    if (edit) {
        await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
    } else {
        await ctx.reply(text, opts);
    }
}

function buildNavRow(page, totalPages, prefix) {
    if (totalPages <= 1) return null;
    const buttons = [];
    if (page > 0) buttons.push(Markup.button.callback('◀️', `${prefix}_page_${page - 1}`));
    buttons.push(Markup.button.callback(`${page + 1} / ${totalPages}`, 'noop'));
    if (page < totalPages - 1) buttons.push(Markup.button.callback('▶️', `${prefix}_page_${page + 1}`));
    return buttons;
}

// ─────────────────────────────────────────────
// ЗАПУСК
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (process.env.WEBHOOK_URL) {
    await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
    const { default: express } = await import('express');
    const app = express();
    app.use(bot.webhookCallback('/webhook'));
    app.get('/', (_, res) => res.send('Oruk Market Bot is running ✅'));
    app.listen(PORT, () => console.log(`🚀 Bot webhook running on port ${PORT}`));
} else {
    console.log('🤖 Bot started in polling mode');
    bot.launch();
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));