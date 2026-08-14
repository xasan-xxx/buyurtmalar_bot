const { Markup } = require('telegraf');
const prisma = require('../prismaClient');

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function handleTableText(ctx) {
  const text = ctx.message.text.trim();
  const tableNumber = Number(text);

  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 50) {
    return ctx.reply('Stol raqami 1 dan 50 gacha bo\'lgan butun son bo\'lishi kerak. Qayta kiriting:');
  }

  ctx.session.tableNumber = tableNumber;
  ctx.session.step = 'awaiting_order_text';
  return ctx.reply('Buyurtmani yozing (masalan: 2ta lag\'mon, 1ta choy):');
}

async function handleOrderText(ctx) {
  const itemsText = ctx.message.text.trim();
  if (!itemsText) {
    return ctx.reply('Buyurtma matni bo\'sh bo\'lishi mumkin emas. Qayta kiriting:');
  }

  ctx.session.itemsText = itemsText;
  ctx.session.step = 'awaiting_confirmation';

  const summary =
    `Stol: ${ctx.session.tableNumber}\n` +
    `Buyurtma: ${itemsText}\n\n` +
    `Tasdiqlaysizmi?`;

  return ctx.reply(
    summary,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', 'confirm_order'),
        Markup.button.callback('❌ Bekor qilish', 'cancel_order'),
      ],
    ])
  );
}

async function handleConfirmOrder(ctx) {
  await ctx.answerCbQuery();

  if (ctx.session.step !== 'awaiting_confirmation' || !ctx.session.waiterId) {
    return ctx.editMessageText('Bu buyurtma allaqachon qayta ishlangan yoki eskirgan.');
  }

  const orderGroup = await prisma.orderGroup.findFirst();
  if (!orderGroup) {
    ctx.session.step = 'awaiting_table';
    ctx.session.tableNumber = null;
    ctx.session.itemsText = null;
    return ctx.editMessageText(
      'Hozircha buyurtmalar guruhi sozlanmagan, admin bilan bog\'laning.'
    );
  }

  const order = await prisma.order.create({
    data: {
      waiterId: ctx.session.waiterId,
      tableNumber: ctx.session.tableNumber,
      itemsText: ctx.session.itemsText,
    },
  });

  const message =
    `🆕 Yangi buyurtma\n` +
    `Stol: ${order.tableNumber}\n` +
    `Ofitsiant: ${ctx.session.waiterFullName}\n` +
    `Buyurtma: ${order.itemsText}\n` +
    `Vaqt: ${formatDateTime(order.createdAt)}`;

  try {
    await ctx.telegram.sendMessage(orderGroup.chatId.toString(), message);
  } catch (err) {
    ctx.session.step = 'awaiting_table';
    ctx.session.tableNumber = null;
    ctx.session.itemsText = null;
    return ctx.editMessageText(
      'Buyurtma DB\'ga saqlandi, lekin guruhga xabar yuborib bo\'lmadi. Admin bilan bog\'laning.'
    );
  }

  ctx.session.tableNumber = null;
  ctx.session.itemsText = null;
  ctx.session.step = 'awaiting_table';

  await ctx.editMessageText('Buyurtma yuborildi ✅');
  return ctx.reply('Stol raqamini kiriting (1-50):');
}

async function handleCancelOrder(ctx) {
  await ctx.answerCbQuery();

  ctx.session.tableNumber = null;
  ctx.session.itemsText = null;
  ctx.session.step = 'awaiting_table';

  await ctx.editMessageText('Buyurtma bekor qilindi ❌');
  return ctx.reply('Stol raqamini kiriting (1-50):');
}

module.exports = {
  handleTableText,
  handleOrderText,
  handleConfirmOrder,
  handleCancelOrder,
};
