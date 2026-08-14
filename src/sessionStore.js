const prisma = require('./prismaClient');

async function getSession(telegramId) {
  const id = BigInt(telegramId);
  let session = await prisma.session.findUnique({ where: { telegramId: id } });
  if (!session) {
    session = await prisma.session.create({
      data: { telegramId: id, step: 'idle', tempData: {} },
    });
  }
  return session;
}

async function updateSession(telegramId, data) {
  const id = BigInt(telegramId);
  return prisma.session.update({ where: { telegramId: id }, data });
}

async function resetSession(telegramId) {
  return updateSession(telegramId, {
    step: 'idle',
    tempData: {},
    waiterId: null,
  });
}

module.exports = { getSession, updateSession, resetSession };
