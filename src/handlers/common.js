const { cancelKeyboard } = require('../keyboards');

// Matn/raqam so'raladigan har bir bosqichda "❌ Bekor qilish" tugmasi bilan birga yuboriladi.
function askForInput(ctx, promptText) {
  return ctx.reply(promptText, cancelKeyboard());
}

module.exports = { askForInput };
