const { Markup } = require('telegraf');

const SUPPORT_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '6005134432';
const SUPPORT_USERNAME = '@xasan_yarashov';

async function handleSupport(ctx) {
  await ctx.reply(
    "🆘 Yordam kerakmi? Quyidagi tugma orqali to'g'ridan-to'g'ri bog'laning:",
    Markup.inlineKeyboard([
      [Markup.button.url('Support bilan bog\'lanish', `tg://user?id=${SUPPORT_TELEGRAM_ID}`)],
    ])
  );

  return ctx.reply(`Tugma ishlamasa, yordam uchun: ${SUPPORT_USERNAME} ga yozing`);
}

module.exports = { handleSupport };
