const { getSession, updateSession } = require('../sessionStore');
const auth = require('./auth');
const adminPanel = require('./adminPanel');

// Barcha "... kiriting" bosqichlarida ishlaydigan universal bekor qilish handleri.
async function handleCancelAction(ctx) {
  await ctx.answerCbQuery();

  const session = await getSession(ctx.from.id);
  const wasAdminStep = typeof session.step === 'string' && session.step.startsWith('admin_');

  await updateSession(ctx.from.id, { step: 'idle', tempData: {} });

  try {
    await ctx.editMessageText('Bekor qilindi ❌');
  } catch (err) {
    // Xabarni tahrirlab bo'lmasa (masalan eskirgan bo'lsa) e'tiborsiz qoldiriladi.
  }

  if (wasAdminStep) {
    return adminPanel.returnToMenu(ctx);
  }
  if (auth.isAuthenticated(session)) {
    return auth.sendMainMenu(ctx, session.waiterId);
  }
  return auth.showAuthChoice(ctx);
}

module.exports = { handleCancelAction };
