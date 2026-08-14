const prisma = require('../prismaClient');
const { isAdmin } = require('./subscription');

const DAY_MS = 24 * 60 * 60 * 1000;

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

module.exports = { handleActivateSub };
