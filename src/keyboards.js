const { Markup } = require('telegraf');

const BTN_NEW_ORDER = '🆕 Yangi buyurtma';
const BTN_ADD_GROUP = "➕ Guruh qo'shish";
const BTN_CHANGE_GROUP = "🔄 Guruhni o'zgartirish";
const BTN_SUPPORT = '🆘 Yordam (Support)';
const BTN_RESET_PASSWORD = "🔑 Parolni almashtirish";
const BTN_LOGOUT = '🚪 Akkountdan chiqish';

const BTN_ADD_DAYS = "➕ Kun qo'shish";
const BTN_REMOVE_DAYS = '➖ Kun ayirish';
const BTN_LIST_USERS = "👥 Userlar ro'yxati";

function startKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Akkount yaratish', 'auth:register')],
    [Markup.button.callback('Akkountga kirish', 'auth:login')],
  ]);
}

// Admin uchun asosiy menyuga qo'shimcha ravishda pastda doim ko'rinadigan qatorlar.
function adminExtraRows() {
  return [[BTN_ADD_DAYS], [BTN_REMOVE_DAYS], [BTN_LIST_USERS]];
}

function mainMenuKeyboard(hasGroup, { isAdmin = false } = {}) {
  const groupLabel = hasGroup ? BTN_CHANGE_GROUP : BTN_ADD_GROUP;
  const rows = [
    [BTN_NEW_ORDER],
    [groupLabel],
    [BTN_RESET_PASSWORD],
    [BTN_SUPPORT],
    [BTN_LOGOUT],
  ];
  if (isAdmin) {
    rows.push(...adminExtraRows());
  }
  return Markup.keyboard(rows).resize();
}

// Admin hali login qilmagan bo'lsa ham doim ko'rinadigan mustaqil admin klaviaturasi.
function adminOnlyKeyboard() {
  return Markup.keyboard(adminExtraRows()).resize();
}

function orderConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', 'order:confirm'),
      Markup.button.callback('❌ Bekor qilish', 'order:cancel'),
    ],
  ]);
}

// Matn/raqam kutilayotgan har bir bosqichda ko'rsatiladigan umumiy bekor qilish tugmasi.
function cancelKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ Bekor qilish', 'cancel_action')],
  ]);
}

module.exports = {
  BTN_NEW_ORDER,
  BTN_ADD_GROUP,
  BTN_CHANGE_GROUP,
  BTN_SUPPORT,
  BTN_RESET_PASSWORD,
  BTN_LOGOUT,
  BTN_ADD_DAYS,
  BTN_REMOVE_DAYS,
  BTN_LIST_USERS,
  startKeyboard,
  mainMenuKeyboard,
  adminOnlyKeyboard,
  orderConfirmKeyboard,
  cancelKeyboard,
};
