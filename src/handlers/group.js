const prisma = require('../prismaClient');
const { mainMenuKeyboard } = require('../keyboards');

async function showSetupInstructions(ctx) {
  return ctx.reply(
    "Botni buyurtmalar guruhiga qo'shing va o'sha guruhda /setgroup buyrug'ini yozing."
  );
}

async function handleSetGroupCommand(ctx) {
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return;
  }

  const chatId = BigInt(ctx.chat.id);
  const name = ctx.chat.title || null;

  const existing = await prisma.orderGroup.findFirst();
  if (existing) {
    await prisma.orderGroup.update({
      where: { id: existing.id },
      data: { chatId, name, setAt: new Date() },
    });
  } else {
    await prisma.orderGroup.create({ data: { chatId, name } });
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
