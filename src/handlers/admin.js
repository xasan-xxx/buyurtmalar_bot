const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const { isAdmin } = require('./subscription');

const DAY_MS = 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 10;
const USERS_PER_PAGE = 10;

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
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

  const lines = waiters.map(
    (w) =>
      `👤 ${w.username}\n` +
      `Holat: ${w.subscriptionStatus}\n` +
      `Trial tugash: ${formatDateTime(w.trialEndsAt)}\n` +
      `Ro'yxatdan o'tgan: ${formatDateTime(w.createdAt)}\n` +
      `---`
  );

  for (let i = 0; i < lines.length; i += USERS_PER_PAGE) {
    const chunk = lines.slice(i, i + USERS_PER_PAGE).join('\n');
    await ctx.reply(chunk);
  }
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

module.exports = { handleActivateSub, handleListUsers, handleResetPassword };
