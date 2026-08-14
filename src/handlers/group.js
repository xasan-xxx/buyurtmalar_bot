const prisma = require('../prismaClient');
const { getSession } = require('../sessionStore');
const { mainMenuKeyboard } = require('../keyboards');
const { checkAccess } = require('./subscription');

async function showSetupInstructions(ctx) {
  return ctx.reply(
    "Botni buyurtmalar guruhiga qo'shing va o'sha guruhda /setgroup buyrug'ini yozing."
  );
}

async function handleSetGroupCommand(ctx) {
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return;
  }

  const session = await getSession(ctx.from.id);
  if (!session.waiterId) {
    return ctx.reply(
      "Guruhni sozlash uchun avval botga shaxsiy chatda ofitsiant sifatida kiring."
    );
  }

  const access = await checkAccess(ctx, session.waiterId);
  if (!access.allowed) {
    return ctx.reply(access.message);
  }

  const chatId = BigInt(ctx.chat.id);
  const name = ctx.chat.title || null;

  const existing = await prisma.orderGroup.findFirst();
  if (existing) {
    if (existing.createdByWaiterId !== session.waiterId) {
      return ctx.reply("Faqat guruhni yaratgan foydalanuvchi uni o'zgartira oladi.");
    }
    await prisma.orderGroup.update({
      where: { id: existing.id },
      data: { chatId, name, setAt: new Date() },
    });
  } else {
    await prisma.orderGroup.create({
      data: { chatId, name, createdByWaiterId: session.waiterId },
    });
  }

  await ctx.reply('✅ Bu guruh buyurtmalar guruhi sifatida sozlandi');

  try {
    await ctx.telegram.sendMessage(
      ctx.from.id,
      'Guruh muvaffaqiyatli sozlandi',
      mainMenuKeyboard(true)
    );
  } catch (err) {
    // Foydalanuvchi bot bilan private chatni boshlamagan bo'lishi mumkin, e'tiborsiz qoldiriladi.
  }
}

module.exports = { showSetupInstructions, handleSetGroupCommand };
