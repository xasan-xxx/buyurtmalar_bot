const sessions = new Map();

function defaultSession() {
  return {
    step: 'idle',
    waiterId: null,
    waiterFullName: null,
    loginAttempts: 0,
    blockedUntil: null,
    tempLogin: null,
    tableNumber: null,
    itemsText: null,
  };
}

function sessionMiddleware() {
  return (ctx, next) => {
    if (!ctx.from) return next();
    const key = ctx.from.id;
    if (!sessions.has(key)) {
      sessions.set(key, defaultSession());
    }
    ctx.session = sessions.get(key);
    return next();
  };
}

module.exports = { sessionMiddleware, defaultSession };
