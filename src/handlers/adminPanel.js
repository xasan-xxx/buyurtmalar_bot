const { Markup } = require('telegraf');
const prisma = require('../prismaClient');
const { updateSession } = require('../sessionStore');
const { handleListUsers } = require('./admin');

const DAY_MS = 24 * 60 * 60 * 1000;

const BTN_ADD_DAYS = "➕ Kun qo'shish";
const BTN_REMOVE_DAYS = '➖ Kun ayirish';
const BTN_LIST_USERS = "👥 Userlar ro'yxati";

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function adminMenuKeyboard() {
  return Markup.keyboard([[BTN_ADD_DAYS], [BTN_REMOVE_DAYS], [BTN_LIST_USERS]]).resize();
}

async function sendAdminMenu(ctx, text = '🛠 Admin panel:') {
  return ctx.reply(text, adminMenuKeyboard());
}

async function startAddDays(ctx) {
  await updateSession(ctx.from.id, {
    step: 'admin_days_username',
    tempData: { dayAction: 'add' },
  });
  return ctx.reply("Qaysi username'ga kun qo'shmoqchisiz?");
}

async function startRemoveDays(ctx) {
  await updateSession(ctx.from.id, {
    step: 'admin_days_username',
    tempData: { dayAction: 'remove' },
  });
  return ctx.reply("Qaysi username'dan kun ayirmoqchisiz?");
}

async function handleDaysUsername(ctx, session) {
  const username = ctx.message.text.trim();
  const waiter = await prisma.waiter.findUnique({ where: { username } });

  if (!waiter) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.reply('Bunday foydalanuvchi topilmadi');
    return sendAdminMenu(ctx);
  }

  const { dayAction } = session.tempData || {};
  await updateSession(ctx.from.id, {
    step: 'admin_days_count',
    tempData: { dayAction, username },
  });

  const question =
    dayAction === 'add' ? "Nechta kun qo'shmoqchisiz?" : 'Nechta kun ayirmoqchisiz?';
  return ctx.reply(question);
}

async function handleDaysCount(ctx, session) {
  const raw = ctx.message.text.trim();
  const days = Number(raw);

  if (!Number.isInteger(days) || days <= 0) {
    return ctx.reply("Kun soni musbat butun son bo'lishi kerak. Qaytadan kiriting:");
  }

  const { dayAction, username } = session.tempData || {};
  const waiter = await prisma.waiter.findUnique({ where: { username } });

  if (!waiter) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.reply('Bunday foydalanuvchi topilmadi');
    return sendAdminMenu(ctx);
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
    return sendAdminMenu(ctx);
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
  return sendAdminMenu(ctx);
}

async function handleAdminText(ctx, session, text) {
  if (text === BTN_ADD_DAYS) {
    return startAddDays(ctx);
  }
  if (text === BTN_REMOVE_DAYS) {
    return startRemoveDays(ctx);
  }
  if (text === BTN_LIST_USERS) {
    return handleListUsers(ctx);
  }

  switch (session.step) {
    case 'admin_days_username':
      return handleDaysUsername(ctx, session);
    case 'admin_days_count':
      return handleDaysCount(ctx, session);
    default:
      return sendAdminMenu(ctx);
  }
}

module.exports = {
  BTN_ADD_DAYS,
  BTN_REMOVE_DAYS,
  BTN_LIST_USERS,
  adminMenuKeyboard,
  sendAdminMenu,
  handleAdminText,
};
