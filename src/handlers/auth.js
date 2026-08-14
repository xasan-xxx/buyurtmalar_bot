const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const { defaultSession } = require('../session');

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60 * 1000;

function isAuthenticated(session) {
  return Boolean(session.waiterId);
}

function startLogin(ctx) {
  Object.assign(ctx.session, defaultSession());
  ctx.session.step = 'awaiting_login';
  return ctx.reply('Login kiriting:');
}

async function handleStart(ctx) {
  if (isAuthenticated(ctx.session)) {
    ctx.session.step = 'awaiting_table';
    return ctx.reply(`Xush kelibsiz, ${ctx.session.waiterFullName}!\nStol raqamini kiriting (1-50):`);
  }
  return startLogin(ctx);
}

async function handleLoginText(ctx) {
  const login = ctx.message.text.trim();
  if (!login) {
    return ctx.reply('Login bo\'sh bo\'lishi mumkin emas. Qayta kiriting:');
  }
  ctx.session.tempLogin = login;
  ctx.session.step = 'awaiting_password';
  return ctx.reply('Parol kiriting:');
}

async function handlePasswordText(ctx) {
  const now = Date.now();
  if (ctx.session.blockedUntil && now < ctx.session.blockedUntil) {
    const secondsLeft = Math.ceil((ctx.session.blockedUntil - now) / 1000);
    return ctx.reply(`Juda ko'p xato urinish. ${secondsLeft} soniyadan keyin qayta urinib ko'ring.`);
  }

  const password = ctx.message.text;
  const login = ctx.session.tempLogin;

  const waiter = await prisma.waiter.findUnique({ where: { login } });

  let ok = false;
  if (waiter && waiter.active) {
    ok = await bcrypt.compare(password, waiter.passwordHash);
  }

  if (!ok) {
    ctx.session.loginAttempts += 1;
    if (ctx.session.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      ctx.session.blockedUntil = now + BLOCK_DURATION_MS;
      ctx.session.loginAttempts = 0;
      ctx.session.step = 'awaiting_login';
      ctx.session.tempLogin = null;
      return ctx.reply('Juda ko\'p xato urinish. 1 daqiqaga bloklandingiz.');
    }
    ctx.session.step = 'awaiting_login';
    ctx.session.tempLogin = null;
    return ctx.reply('Login yoki parol xato. Qayta login kiriting:');
  }

  ctx.session.loginAttempts = 0;
  ctx.session.blockedUntil = null;
  ctx.session.waiterId = waiter.id;
  ctx.session.waiterFullName = waiter.fullName;
  ctx.session.tempLogin = null;
  ctx.session.step = 'awaiting_table';

  return ctx.reply(`Muvaffaqiyatli kirdingiz, ${waiter.fullName}!\nStol raqamini kiriting (1-50):`);
}

module.exports = {
  isAuthenticated,
  startLogin,
  handleStart,
  handleLoginText,
  handlePasswordText,
};
