const { Markup } = require('telegraf');

const BTN_NEW_ORDER = '🆕 Yangi buyurtma';
const BTN_ADD_GROUP = "➕ Guruh qo'shish";
const BTN_CHANGE_GROUP = "🔄 Guruhni o'zgartirish";
const BTN_LOGOUT = '🚪 Akkountdan chiqish';

function startKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Akkount yaratish', 'auth:register')],
    [Markup.button.callback('Akkountga kirish', 'auth:login')],
  ]);
}

function mainMenuKeyboard(hasGroup) {
  const groupLabel = hasGroup ? BTN_CHANGE_GROUP : BTN_ADD_GROUP;
  return Markup.keyboard([
    [BTN_NEW_ORDER],
    [groupLabel],
    [BTN_LOGOUT],
  ]).resize();
}

function orderConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', 'order:confirm'),
      Markup.button.callback('❌ Bekor qilish', 'order:cancel'),
    ],
  ]);
}

module.exports = {
  BTN_NEW_ORDER,
  BTN_ADD_GROUP,
  BTN_CHANGE_GROUP,
  BTN_LOGOUT,
  startKeyboard,
  mainMenuKeyboard,
  orderConfirmKeyboard,
};
