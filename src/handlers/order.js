const prisma = require('../prismaClient');
const { getSession, updateSession } = require('../sessionStore');
const { orderConfirmKeyboard, mainMenuKeyboard } = require('../keyboards');
const { checkAccess, isAdmin } = require('./subscription');
const { askForInput } = require('./common');

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

async function startNewOrder(ctx) {
  await updateSession(ctx.from.id, { step: 'awaiting_table', tempData: {} });
  return askForInput(ctx, "Stol raqamini kiriting (1-300):");
}

async function handleTableText(ctx, session) {
  const text = ctx.message.text.trim();
  const tableNumber = Number(text);

  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 300) {
    return askForInput(
      ctx,
      "Stol raqami 1 dan 300 gacha bo'lgan butun son bo'lishi kerak. Qaytadan kiriting:"
    );
  }

  await updateSession(ctx.from.id, {
    step: 'awaiting_order_text',
    tempData: { ...(session.tempData || {}), tableNumber },
  });
  return askForInput(ctx, "Buyurtmani yozing (masalan: 2ta lag'mon, 1ta choy):");
}

async function handleOrderText(ctx, session) {
  const itemsText = ctx.message.text.trim();
  if (!itemsText) {
    return askForInput(ctx, "Buyurtma matni bo'sh bo'lishi mumkin emas. Qaytadan kiriting:");
  }

  const tableNumber = (session.tempData || {}).tableNumber;

  await updateSession(ctx.from.id, {
    step: 'awaiting_confirmation',
    tempData: { ...(session.tempData || {}), itemsText },
  });

  const summary = `Stol: ${tableNumber}\nBuyurtma: ${itemsText}\n\nTasdiqlaysizmi?`;

  return ctx.reply(summary, orderConfirmKeyboard());
}

async function handleConfirmOrder(ctx) {
  await ctx.answerCbQuery();

  const session = await getSession(ctx.from.id);

  if (session.step !== 'awaiting_confirmation' || !session.waiterId) {
    return ctx.editMessageText('Bu buyurtma allaqachon qayta ishlangan yoki eskirgan.');
  }

  const access = await checkAccess(ctx, session.waiterId);
  if (!access.allowed) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.editMessageText(access.message);
    const group = await prisma.orderGroup.findUnique({ where: { waiterId: session.waiterId } });
    return ctx.reply('Asosiy menyu:', mainMenuKeyboard(Boolean(group), { isAdmin: isAdmin(ctx) }));
  }

  const orderGroup = await prisma.orderGroup.findUnique({
    where: { waiterId: session.waiterId },
  });
  if (!orderGroup) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.editMessageText(
      "Guruh hali sozlanmagan, avval 'Guruh qo'shish' orqali sozlang."
    );
    return ctx.reply('Asosiy menyu:', mainMenuKeyboard(false, { isAdmin: isAdmin(ctx) }));
  }

  const { tableNumber, itemsText } = session.tempData || {};

  const order = await prisma.order.create({
    data: { waiterId: session.waiterId, tableNumber, itemsText },
  });

  const telegramName = ctx.from.last_name
    ? `${ctx.from.first_name} ${ctx.from.last_name}`
    : ctx.from.first_name;

  const message =
    `🆕 Yangi buyurtma\n` +
    `Stol: ${order.tableNumber}\n` +
    `Ofitsiant: ${telegramName}\n` +
    `Buyurtma: ${order.itemsText}\n` +
    `Vaqt: ${formatDateTime(order.createdAt)}`;

  try {
    await ctx.telegram.sendMessage(orderGroup.chatId.toString(), message);
  } catch (err) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    await ctx.editMessageText(
      "Buyurtma DB'ga saqlandi, lekin guruhga xabar yuborib bo'lmadi. Admin bilan bog'laning."
    );
    return ctx.reply('Asosiy menyu:', mainMenuKeyboard(true, { isAdmin: isAdmin(ctx) }));
  }

  await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
  await ctx.editMessageText('Buyurtma yuborildi ✅');
  return ctx.reply('Asosiy menyu:', mainMenuKeyboard(true, { isAdmin: isAdmin(ctx) }));
}

async function handleCancelOrder(ctx) {
  await ctx.answerCbQuery();

  const session = await getSession(ctx.from.id);
  await updateSession(ctx.from.id, { step: 'idle', tempData: {} });

  await ctx.editMessageText('Buyurtma bekor qilindi ❌');
  const group = session.waiterId
    ? await prisma.orderGroup.findUnique({ where: { waiterId: session.waiterId } })
    : null;
  return ctx.reply(
    'Asosiy menyu:',
    mainMenuKeyboard(Boolean(group), { isAdmin: isAdmin(ctx) })
  );
}

module.exports = {
  startNewOrder,
  handleTableText,
  handleOrderText,
  handleConfirmOrder,
  handleCancelOrder,
};
