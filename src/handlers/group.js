const prisma = require('../prismaClient');
const { getSession } = require('../sessionStore');
const { mainMenuKeyboard } = require('../keyboards');
const { checkAccess, isAdmin } = require('./subscription');

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

  // Shu jismoniy Telegram guruhi allaqachon boshqa akkountga bog'langanmi tekshiramiz.
  const chatOwner = await prisma.orderGroup.findUnique({ where: { chatId } });
  if (chatOwner && chatOwner.waiterId !== session.waiterId) {
    return ctx.reply("Bu guruh allaqachon boshqa akkountga bog'langan.");
  }

  const existing = await prisma.orderGroup.findUnique({
    where: { waiterId: session.waiterId },
  });

  if (existing) {
    await prisma.orderGroup.update({
      where: { id: existing.id },
      data: { chatId, name, setAt: new Date() },
    });
  } else {
    await prisma.orderGroup.create({
      data: { chatId, name, waiterId: session.waiterId },
    });
  }

  await ctx.reply('✅ Bu guruh buyurtmalar guruhi sifatida sozlandi');

  try {
    await ctx.telegram.sendMessage(
      ctx.from.id,
      'Guruh muvaffaqiyatli sozlandi',
      mainMenuKeyboard(true, { isAdmin: isAdmin(ctx) })
    );
  } catch (err) {
    // Foydalanuvchi bot bilan private chatni boshlamagan bo'lishi mumkin, e'tiborsiz qoldiriladi.
  }
}

module.exports = { showSetupInstructions, handleSetGroupCommand };
