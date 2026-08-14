const prisma = require('../prismaClient');

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;
const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const BLOCKED_MESSAGE = `⛔ Bepul muddat tugadi (yoki obuna muddati tugadi).

Botdan foydalanishni davom ettirish uchun tarif tanlang:
💳 Oyiga - 300,000 so'm
💳 Yiliga - 2,000,000 so'm

Tarif olish uchun @xasan_yarashov ga yozing.`;

function isAdmin(ctx) {
  return Boolean(ADMIN_TELEGRAM_ID) && String(ctx.from.id) === String(ADMIN_TELEGRAM_ID);
}

function computeTrialEndsAt(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * DAY_MS);
}

// Har bir akkount (Waiter yozuvi) uchun obuna holatini tekshiradi.
// Admin uchun har doim cheklovsiz ruxsat beriladi.
async function checkAccess(ctx, waiterId) {
  if (isAdmin(ctx)) {
    return { allowed: true };
  }

  const waiter = await prisma.waiter.findUnique({ where: { id: waiterId } });
  if (!waiter) {
    return { allowed: false, message: 'Akkount topilmadi.' };
  }

  const now = new Date();
  let status = waiter.subscriptionStatus;

  if (status === 'trial' && now >= waiter.trialEndsAt) {
    await prisma.waiter.update({
      where: { id: waiter.id },
      data: { subscriptionStatus: 'expired' },
    });
    status = 'expired';
  } else if (
    status === 'active' &&
    waiter.subscriptionExpiresAt &&
    now >= waiter.subscriptionExpiresAt
  ) {
    await prisma.waiter.update({
      where: { id: waiter.id },
      data: { subscriptionStatus: 'expired' },
    });
    status = 'expired';
  }

  if (status === 'expired') {
    return { allowed: false, message: BLOCKED_MESSAGE };
  }

  let warning = null;
  if (status === 'trial') {
    const daysLeft = Math.ceil((waiter.trialEndsAt.getTime() - now.getTime()) / DAY_MS);
    if (daysLeft <= 1) {
      warning = `⏳ Sizda ${daysLeft} kun bepul foydalanish qoldi.`;
    }
  }

  return { allowed: true, warning };
}

module.exports = {
  isAdmin,
  computeTrialEndsAt,
  checkAccess,
  BLOCKED_MESSAGE,
  TRIAL_DAYS,
};
