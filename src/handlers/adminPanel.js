const prisma = require('../prismaClient');
const { getSession, updateSession } = require('../sessionStore');
const { BTN_ADD_DAYS, BTN_REMOVE_DAYS, BTN_LIST_USERS, adminOnlyKeyboard } = require('../keyboards');
const { handleListUsers } = require('./admin');
const auth = require('./auth');
const { askForInput } = require('./common');

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

async function sendAdminMenu(ctx, text = '🛠 Admin panel:') {
  return ctx.reply(text, adminOnlyKeyboard());
}

// Amal tugagach: agar admin o'zi ham login qilgan ofitsiant bo'lsa - to'liq asosiy
// menyuga (admin qatorlari bilan birga) qaytaradi, aks holda mustaqil admin panelini ko'rsatadi.
async function returnToMenu(ctx) {
  const session = await getSession(ctx.from.id);
  if (session.waiterId) {
    return auth.sendMainMenu(ctx, session.waiterId);
  }
  return sendAdminMenu(ctx);
}

async function startAddDays(ctx) {
  await updateSession(ctx.from.id, {
    step: 'admin_days_username',
    tempData: { dayAction: 'add' },
  });
  return askForInput(ctx, "Qaysi username'ga kun qo'shmoqchisiz?");
}

async function startRemoveDays(ctx) {
  await updateSession(ctx.from.id, {
    step: 'admin_days_username',
    tempData: { dayAction: 'remove' },
  });
  return askForInput(ctx, "Qaysi username'dan kun ayirmoqchisiz?");
}

async function handleDaysUsername(ctx, session) {
  const username = ctx.message.text.trim();
  const waiter = await prisma.waiter.findUnique({ where: { username } });

  if (!waiter) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.reply('Bunday foydalanuvchi topilmadi');
    return returnToMenu(ctx);
  }

  const { dayAction } = session.tempData || {};
  await updateSession(ctx.from.id, {
    step: 'admin_days_count',
    tempData: { dayAction, username },
  });

  const question =
    dayAction === 'add' ? "Nechta kun qo'shmoqchisiz?" : 'Nechta kun ayirmoqchisiz?';
  return askForInput(ctx, question);
}

async function handleDaysCount(ctx, session) {
  const raw = ctx.message.text.trim();
  const days = Number(raw);

  if (!Number.isInteger(days) || days <= 0) {
    return askForInput(ctx, "Kun soni musbat butun son bo'lishi kerak. Qaytadan kiriting:");
  }

  const { dayAction, username } = session.tempData || {};
  const waiter = await prisma.waiter.findUnique({ where: { username } });

  if (!waiter) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.reply('Bunday foydalanuvchi topilmadi');
    return returnToMenu(ctx);
  }

  const now = new Date();

  if (dayAction === 'add') {
    let base = now;
    if (
      waiter.subscriptionStatus === 'active' &&
      waiter.subscriptionExpiresAt &&
      waiter.subscriptionExpiresAt > now
    ) {
      base = waiter.subscriptionExpiresAt;
    }
    const newExpiresAt = new Date(base.getTime() + days * DAY_MS);

    await prisma.waiter.update({
      where: { id: waiter.id },
      data: { subscriptionStatus: 'active', subscriptionExpiresAt: newExpiresAt },
    });

    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.reply(
      `✅ ${username} uchun ${days} kun qo'shildi. Yangi tugash sanasi: ${formatDateTime(
        newExpiresAt
      )}`
    );
    return returnToMenu(ctx);
  }

  // dayAction === 'remove'
  const base = waiter.subscriptionExpiresAt || now;
  const newExpiresAt = new Date(base.getTime() - days * DAY_MS);
  const newStatus = newExpiresAt < now ? 'expired' : waiter.subscriptionStatus;

  await prisma.waiter.update({
    where: { id: waiter.id },
    data: { subscriptionStatus: newStatus, subscriptionExpiresAt: newExpiresAt },
  });

  await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
  await ctx.reply(
    `✅ ${username}dan ${days} kun ayirildi. Yangi holat: ${newStatus}, sana: ${formatDateTime(
      newExpiresAt
    )}`
  );
  return returnToMenu(ctx);
}

// Admin uchun matnni ushlab qoladi va agar admin panelga tegishli bo'lsa true qaytaradi.
// Aks holda false qaytaradi - chaqiruvchi (bot.js) oddiy ofitsiant oqimiga o'tkazadi,
// shunday qilib admin ham o'zi uchun akkount ochib, oddiy foydalanuvchi kabi ishlata oladi.
async function maybeHandleAdminText(ctx, session, text) {
  if (text === BTN_ADD_DAYS) {
    await startAddDays(ctx);
    return true;
  }
  if (text === BTN_REMOVE_DAYS) {
    await startRemoveDays(ctx);
    return true;
  }
  if (text === BTN_LIST_USERS) {
    await handleListUsers(ctx);
    return true;
  }
  if (session.step === 'admin_days_username') {
    await handleDaysUsername(ctx, session);
    return true;
  }
  if (session.step === 'admin_days_count') {
    await handleDaysCount(ctx, session);
    return true;
  }
  return false;
}

module.exports = {
  sendAdminMenu,
  returnToMenu,
  maybeHandleAdminText,
};
