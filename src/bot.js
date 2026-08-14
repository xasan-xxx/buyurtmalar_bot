require('dotenv').config();
const { Telegraf } = require('telegraf');
const { getSession } = require('./sessionStore');
const {
  BTN_NEW_ORDER,
  BTN_ADD_GROUP,
  BTN_CHANGE_GROUP,
  BTN_SUPPORT,
  BTN_RESET_PASSWORD,
  BTN_LOGOUT,
} = require('./keyboards');
const auth = require('./handlers/auth');
const order = require('./handlers/order');
const group = require('./handlers/group');
const admin = require('./handlers/admin');
const subscription = require('./handlers/subscription');
const support = require('./handlers/support');
const adminPanel = require('./handlers/adminPanel');

const { BOT_TOKEN } = process.env;

if (!BOT_TOKEN) {
  console.error('XATOLIK: .env faylida BOT_TOKEN topilmadi.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- Guruh sozlash buyrug'i (faqat guruh ichida ishlaydi) ---
bot.command('setgroup', group.handleSetGroupCommand);

// --- Admin: obunani qo'lda faollashtirish ---
bot.command('activate_sub', admin.handleActivateSub);
bot.command('users', admin.handleListUsers);
bot.command('reset_password', admin.handleResetPassword);

// --- /start ---
bot.command('start', async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  const session = await getSession(ctx.from.id);
  return auth.handleStart(ctx, session);
});

// --- Inline tugmalar ---
bot.action('auth:register', async (ctx) => {
  await ctx.answerCbQuery();
  return auth.startRegistration(ctx);
});

bot.action('auth:login', async (ctx) => {
  await ctx.answerCbQuery();
  return auth.startLogin(ctx);
});

bot.action('order:confirm', order.handleConfirmOrder);
bot.action('order:cancel', order.handleCancelOrder);

// --- Matnli xabarlar (faqat shaxsiy chat) ---
bot.on('text', async (ctx) => {
  if (ctx.chat.type !== 'private') return;

  const text = ctx.message.text.trim();

  if (text.startsWith('/')) {
    return;
  }

  const session = await getSession(ctx.from.id);

  // Admin panelga tegishli tugma/qadam bo'lsa shu yerda ushlab qolinadi;
  // aks holda admin ham oddiy ofitsiant oqimidan (pastda) foydalana oladi.
  if (subscription.isAdmin(ctx)) {
    const handledByAdminPanel = await adminPanel.maybeHandleAdminText(ctx, session, text);
    if (handledByAdminPanel) return;
  }

  // Asosiy menyu tugmalari joriy jarayonni bekor qilib, yangi amalni boshlaydi.
  if (text === BTN_NEW_ORDER) {
    if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
    const access = await subscription.checkAccess(ctx, session.waiterId);
    if (!access.allowed) return ctx.reply(access.message);
    if (access.warning) await ctx.reply(access.warning);
    return order.startNewOrder(ctx);
  }
  if (text === BTN_ADD_GROUP || text === BTN_CHANGE_GROUP) {
    if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
    const access = await subscription.checkAccess(ctx, session.waiterId);
    if (!access.allowed) return ctx.reply(access.message);
    if (access.warning) await ctx.reply(access.warning);
    return group.showSetupInstructions(ctx);
  }
  if (text === BTN_SUPPORT) {
    if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
    return support.handleSupport(ctx);
  }
  if (text === BTN_RESET_PASSWORD) {
    if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
    return auth.startResetPasswordSelf(ctx, session);
  }
  if (text === BTN_LOGOUT) {
    if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
    return auth.handleLogout(ctx);
  }

  switch (session.step) {
    case 'reg_username':
      return auth.handleRegUsername(ctx, session);
    case 'reg_password':
      return auth.handleRegPassword(ctx, session);
    case 'login_username':
      return auth.handleLoginUsername(ctx, session);
    case 'login_password':
      return auth.handleLoginPassword(ctx, session);
    case 'reset_password_self':
      if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
      return auth.handleResetPasswordSelfText(ctx, session);
    case 'awaiting_table':
      if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
      return order.handleTableText(ctx, session);
    case 'awaiting_order_text':
      if (!auth.isAuthenticated(session)) return auth.showAuthChoice(ctx);
      return order.handleOrderText(ctx, session);
    case 'awaiting_confirmation':
      return ctx.reply(
        "Iltimos, yuqoridagi tugmalardan birini bosing: Tasdiqlash yoki Bekor qilish."
      );
    default:
      if (auth.isAuthenticated(session)) {
        return auth.sendMainMenu(ctx, session.waiterId);
      }
      return auth.showAuthChoice(ctx);
  }
});

bot.catch((err, ctx) => {
  console.error(`Xatolik yuz berdi (update ${ctx.updateType}):`, err);
});

bot
  .launch()
  .then(() => {
    console.log('Bot ishga tushdi.');
  })
  .catch((err) => {
    console.error("Botni ishga tushirib bo'lmadi:", err.message);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
