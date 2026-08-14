const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');

const SALT_ROUNDS = 10;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

function isAdmin(ctx) {
  return ADMIN_TELEGRAM_ID && String(ctx.from.id) === String(ADMIN_TELEGRAM_ID);
}

function adminOnly() {
  return async (ctx, next) => {
    if (!isAdmin(ctx)) {
      return;
    }
    return next();
  };
}

async function handleAddWaiter(ctx) {
  const parts = ctx.message.text.trim().split(/\s+/);
  const [, login, password, ...rest] = parts;

  if (!login || !password || rest.length === 0) {
    return ctx.reply('Foydalanish: /add_waiter login parol Ism_Familiya');
  }

  const fullName = rest.join(' ').replace(/_/g, ' ');

  const existing = await prisma.waiter.findUnique({ where: { login } });
  if (existing) {
    return ctx.reply(`"${login}" login allaqachon mavjud.`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const waiter = await prisma.waiter.create({
    data: { login, passwordHash, fullName },
  });

  return ctx.reply(
    `Ofitsiant qo'shildi ✅\nLogin: ${waiter.login}\nIsm: ${waiter.fullName}`
  );
}

async function handleListWaiters(ctx) {
  const waiters = await prisma.waiter.findMany({ orderBy: { id: 'asc' } });

  if (waiters.length === 0) {
    return ctx.reply('Hozircha ofitsiantlar yo\'q.');
  }

  const lines = waiters.map(
    (w) =>
      `#${w.id} | ${w.login} | ${w.fullName} | ${w.active ? 'faol' : 'bloklangan'}`
  );

  return ctx.reply(lines.join('\n'));
}

async function handleRemoveWaiter(ctx) {
  const parts = ctx.message.text.trim().split(/\s+/);
  const [, login] = parts;

  if (!login) {
    return ctx.reply('Foydalanish: /remove_waiter login');
  }

  const waiter = await prisma.waiter.findUnique({ where: { login } });
  if (!waiter) {
    return ctx.reply(`"${login}" login topilmadi.`);
  }

  await prisma.waiter.update({
    where: { login },
    data: { active: false },
  });

  return ctx.reply(`"${login}" bloklandi/o'chirildi ✅`);
}

async function handleSetGroup(ctx) {
  if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
    return ctx.reply('Bu buyruq faqat guruh ichida ishlaydi.');
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
    await prisma.orderGroup.create({
      data: { chatId, name },
    });
  }

  return ctx.reply('Buyurtmalar guruhi sozlandi ✅');
}

module.exports = {
  isAdmin,
  adminOnly,
  handleAddWaiter,
  handleListWaiters,
  handleRemoveWaiter,
  handleSetGroup,
};
