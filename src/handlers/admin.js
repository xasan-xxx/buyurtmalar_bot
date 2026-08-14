const bcrypt = require('bcrypt');
const { Markup } = require('telegraf');
const prisma = require('../prismaClient');
const { isAdmin } = require('./subscription');

const DAY_MS = 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 10;

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatExpiry(waiter) {
  if (waiter.subscriptionStatus === 'active' && waiter.subscriptionExpiresAt) {
    return formatDateTime(waiter.subscriptionExpiresAt);
  }
  return formatDateTime(waiter.trialEndsAt);
}

async function handleActivateSub(ctx) {
  if (!isAdmin(ctx)) {
    return;
  }

  const parts = ctx.message.text.trim().split(/\s+/);
  const [, username, monthsStr] = parts;

  if (!username || !monthsStr) {
    return ctx.reply('Foydalanish: /activate_sub username oy_soni');
  }

  const months = Number(monthsStr);
  if (!Number.isInteger(months) || months <= 0) {
    return ctx.reply("Oy soni musbat butun son bo'lishi kerak.");
  }

  const waiter = await prisma.waiter.findUnique({ where: { username } });
  if (!waiter) {
    return ctx.reply(`"${username}" username topilmadi.`);
  }

  const subscriptionExpiresAt = new Date(Date.now() + months * 30 * DAY_MS);

  await prisma.waiter.update({
    where: { id: waiter.id },
    data: { subscriptionStatus: 'active', subscriptionExpiresAt },
  });

  return ctx.reply(
    `✅ "${username}" uchun obuna faollashtirildi.\n` +
      `Muddati: ${subscriptionExpiresAt.toLocaleDateString('uz-UZ')} gacha (${months} oy).`
  );
}

async function handleListUsers(ctx) {
  if (!isAdmin(ctx)) {
    return;
  }

  const waiters = await prisma.waiter.findMany({ orderBy: { id: 'asc' } });
  if (waiters.length === 0) {
    return ctx.reply("Hozircha foydalanuvchilar yo'q.");
  }

  for (const w of waiters) {
    const text =
      `👤 ${w.username}\n` + `Holat: ${w.subscriptionStatus}\n` + `Tugash: ${formatExpiry(w)}`;

    await ctx.reply(
      text,
      Markup.inlineKeyboard([
        [Markup.button.callback(`🗑 ${w.username}ni o'chirish`, `admin:del_ask:${w.id}`)],
      ])
    );
  }
}

async function handleDeleteAsk(ctx) {
  if (!isAdmin(ctx)) {
    return;
  }
  await ctx.answerCbQuery();

  const id = Number(ctx.match[1]);
  const waiter = await prisma.waiter.findUnique({ where: { id } });
  if (!waiter) {
    return ctx.editMessageText("Bu foydalanuvchi allaqachon o'chirilgan yoki topilmadi.");
  }

  return ctx.editMessageText(
    `⚠️ ${waiter.username} akkountini butunlay o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Ha, o'chirish", `admin:del_yes:${id}`),
        Markup.button.callback('❌ Bekor qilish', `admin:del_no:${id}`),
      ],
    ])
  );
}

async function handleDeleteConfirm(ctx) {
  if (!isAdmin(ctx)) {
    return;
  }
  await ctx.answerCbQuery();

  const id = Number(ctx.match[1]);
  const waiter = await prisma.waiter.findUnique({ where: { id } });
  if (!waiter) {
    await ctx.editMessageText("Bu foydalanuvchi allaqachon o'chirilgan.");
    return handleListUsers(ctx);
  }

  await prisma.$transaction([
    prisma.order.deleteMany({ where: { waiterId: id } }),
    prisma.orderGroup.deleteMany({ where: { waiterId: id } }),
    prisma.session.updateMany({
      where: { waiterId: id },
      data: { waiterId: null, step: 'idle', tempData: {} },
    }),
    prisma.waiter.delete({ where: { id } }),
  ]);

  await ctx.editMessageText(`✅ ${waiter.username} akkounti o'chirildi`);
  return handleListUsers(ctx);
}

async function handleDeleteCancel(ctx) {
  if (!isAdmin(ctx)) {
    return;
  }
  await ctx.answerCbQuery();

  await ctx.editMessageText('Bekor qilindi');
  return handleListUsers(ctx);
}

async function handleResetPassword(ctx) {
  if (!isAdmin(ctx)) {
    return;
  }

  const parts = ctx.message.text.trim().split(/\s+/);
  const [, username, newPassword] = parts;

  if (!username || !newPassword) {
    return ctx.reply('Foydalanish: /reset_password username yangi_parol');
  }

  const waiter = await prisma.waiter.findUnique({ where: { username } });
  if (!waiter) {
    return ctx.reply('Bunday foydalanuvchi yo\'q');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.waiter.update({
    where: { id: waiter.id },
    data: { passwordHash },
  });

  return ctx.reply(`✅ ${username} uchun parol yangilandi`);
}

module.exports = {
  handleActivateSub,
  handleListUsers,
  handleResetPassword,
  handleDeleteAsk,
  handleDeleteConfirm,
  handleDeleteCancel,
};
