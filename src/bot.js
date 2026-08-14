require('dotenv').config();
const { Telegraf } = require('telegraf');
const { sessionMiddleware } = require('./session');
const auth = require('./handlers/auth');
const order = require('./handlers/order');
const admin = require('./handlers/admin');

const { BOT_TOKEN, ADMIN_TELEGRAM_ID } = process.env;

if (!BOT_TOKEN) {
  console.error('XATOLIK: .env faylida BOT_TOKEN topilmadi.');
  process.exit(1);
}
if (!ADMIN_TELEGRAM_ID) {
  console.error('XATOLIK: .env faylida ADMIN_TELEGRAM_ID topilmadi.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(sessionMiddleware());

// --- Admin buyruqlari (faqat ADMIN_TELEGRAM_ID uchun) ---
bot.command('add_waiter', admin.adminOnly(), admin.handleAddWaiter);
bot.command('list_waiters', admin.adminOnly(), admin.handleListWaiters);
bot.command('remove_waiter', admin.adminOnly(), admin.handleRemoveWaiter);
bot.command('setgroup', admin.adminOnly(), admin.handleSetGroup);

// --- Ofitsiant flow ---
bot.command('start', async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  return auth.handleStart(ctx);
});

bot.action('confirm_order', order.handleConfirmOrder);
bot.action('cancel_order', order.handleCancelOrder);

bot.on('text', async (ctx) => {
  if (ctx.chat.type !== 'private') return;

  const session = ctx.session;
  const text = ctx.message.text;

  if (text.startsWith('/')) {
    if (!auth.isAuthenticated(session)) {
      return auth.startLogin(ctx);
    }
    return;
  }

  switch (session.step) {
    case 'awaiting_login':
      return auth.handleLoginText(ctx);
    case 'awaiting_password':
      return auth.handlePasswordText(ctx);
    case 'awaiting_table':
      if (!auth.isAuthenticated(session)) return auth.startLogin(ctx);
      return order.handleTableText(ctx);
    case 'awaiting_order_text':
      if (!auth.isAuthenticated(session)) return auth.startLogin(ctx);
      return order.handleOrderText(ctx);
    case 'awaiting_confirmation':
      return ctx.reply(
        "Iltimos, yuqoridagi tugmalardan birini bosing: Tasdiqlash yoki Bekor qilish."
      );
    default:
      return auth.startLogin(ctx);
  }
});

bot.catch((err, ctx) => {
  console.error(`Xatolik yuz berdi (update ${ctx.updateType}):`, err);
});

bot.launch().then(() => {
  console.log('Bot ishga tushdi.');
}).catch((err) => {
  console.error('Botni ishga tushirib bo\'lmadi:', err.message);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
