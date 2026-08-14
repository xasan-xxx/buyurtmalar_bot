const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const { updateSession, resetSession } = require('../sessionStore');
const { startKeyboard, mainMenuKeyboard } = require('../keyboards');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 4;
const MAX_LOGIN_ATTEMPTS = 3;

function isAuthenticated(session) {
  return Boolean(session && session.waiterId);
}

async function sendMainMenu(ctx, text = 'Asosiy menyu:') {
  const group = await prisma.orderGroup.findFirst();
  return ctx.reply(text, mainMenuKeyboard(Boolean(group)));
}

async function showAuthChoice(ctx, text = "Xush kelibsiz! Davom etish uchun tanlang:") {
  return ctx.reply(text, startKeyboard());
}

async function handleStart(ctx, session) {
  if (isAuthenticated(session)) {
    await updateSession(ctx.from.id, { step: 'idle', tempData: {} });
    return sendMainMenu(ctx);
  }
  await resetSession(ctx.from.id);
  return showAuthChoice(ctx);
}

// --- Akkount yaratish ---

async function startRegistration(ctx) {
  await updateSession(ctx.from.id, { step: 'reg_username', tempData: {} });
  return ctx.reply('Username tanlang:');
}

async function handleRegUsername(ctx, session) {
  const username = ctx.message.text.trim();
  if (!username) {
    return ctx.reply("Username bo'sh bo'lishi mumkin emas. Qaytadan kiriting:");
  }

  const existing = await prisma.waiter.findUnique({ where: { username } });
  if (existing) {
    return ctx.reply('Bu username band, boshqa username tanlang:');
  }

  await updateSession(ctx.from.id, {
    step: 'reg_password',
    tempData: { ...(session.tempData || {}), username },
  });
  return ctx.reply("Parol o'ylab toping (kamida 4 belgi):");
}

async function handleRegPassword(ctx, session) {
  const password = ctx.message.text;
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return ctx.reply(
      `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak. Qaytadan kiriting:`
    );
  }

  const { username } = session.tempData || {};
  if (!username) {
    await resetSession(ctx.from.id);
    return showAuthChoice(ctx, "Nimadir xato ketdi, qaytadan boshlaymiz.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const waiter = await prisma.waiter.create({
    data: { username, passwordHash },
  });

  await updateSession(ctx.from.id, {
    step: 'idle',
    waiterId: waiter.id,
    tempData: {},
  });

  return sendMainMenu(ctx, 'Akkount yaratildi ✅');
}

// --- Akkountga kirish ---

async function startLogin(ctx) {
  await updateSession(ctx.from.id, { step: 'login_username', tempData: {} });
  return ctx.reply('Username kiriting:');
}

async function handleLoginUsername(ctx) {
  const username = ctx.message.text.trim();

  const waiter = await prisma.waiter.findUnique({ where: { username } });
  if (!waiter || !waiter.active) {
    await resetSession(ctx.from.id);
    return showAuthChoice(ctx, 'Bunday foydalanuvchi topilmadi.');
  }

  await updateSession(ctx.from.id, {
    step: 'login_password',
    tempData: { loginUsername: username, loginAttempts: 0 },
  });
  return ctx.reply('Parolni kiriting:');
}

async function handleLoginPassword(ctx, session) {
  const password = ctx.message.text;
  const { loginUsername, loginAttempts = 0 } = session.tempData || {};

  const waiter = loginUsername
    ? await prisma.waiter.findUnique({ where: { username: loginUsername } })
    : null;

  const ok = Boolean(
    waiter && waiter.active && (await bcrypt.compare(password, waiter.passwordHash))
  );

  if (!ok) {
    const attempts = loginAttempts + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await updateSession(ctx.from.id, { step: 'login_username', tempData: {} });
      return ctx.reply("Parol xato. Urinishlar tugadi. Username qaytadan kiriting:");
    }
    await updateSession(ctx.from.id, {
      tempData: { ...(session.tempData || {}), loginAttempts: attempts },
    });
    return ctx.reply(`Parol xato. Qaytadan kiriting: (${attempts}/${MAX_LOGIN_ATTEMPTS})`);
  }

  await updateSession(ctx.from.id, {
    step: 'idle',
    waiterId: waiter.id,
    tempData: {},
  });

  return sendMainMenu(ctx, 'Kirdingiz ✅');
}

async function handleLogout(ctx) {
  await resetSession(ctx.from.id);
  return showAuthChoice(ctx, 'Chiqdingiz.');
}

module.exports = {
  isAuthenticated,
  sendMainMenu,
  showAuthChoice,
  handleStart,
  startRegistration,
  handleRegUsername,
  handleRegPassword,
  startLogin,
  handleLoginUsername,
  handleLoginPassword,
  handleLogout,
};
