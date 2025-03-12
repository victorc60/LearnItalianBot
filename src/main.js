import { Telegraf, session } from 'telegraf';
import axios from 'axios';
import config from 'config';
import sequelize from './database/database.js';
import User from './models/user.js';

// Инициализация базы
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ База данных подключена.');
    await sequelize.sync({ alter: true });
    console.log('✅ База данных синхронизирована.');
  } catch (error) {
    console.error('❌ Ошибка при подключении к базе:', error);
  }
}
initDatabase();

// Инициализация бота
const bot = new Telegraf(config.TELEGRAM_TOKEN);
bot.use(session());

// Инициализация сессии (ограничение истории в 3000 символов)
const INITIAL_SESSION = { dialog: "" };

// Функция для запроса к DeepSeek API
async function getDeepSeekResponse(messages) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      { model: 'deepseek-chat', messages },
      {
        headers: {
          Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Ошибка при запросе к DeepSeek:', error.response?.data || error.message);
    return null;
  }
}

// Команда /start
bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username || 'unknown';

  await User.findOrCreate({
    where: { id: userId },
    defaults: { username, level: 'A1' }
  });

  await ctx.reply(
    'Привет! Укажи свой уровень итальянского: \nA1 (Начальный)\nA2 (Элементарный)\nB1 (Средний)\nB2 (Продвинутый)\nC1 (Профессиональный)\nC2 (Владение в совершенстве)'
  );
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  const userMessage = ctx.message.text;

  console.log(`💬 Сообщение от ${ctx.message.from.username || ctx.message.from.id}: ${userMessage}`);
  
  await ctx.reply('🔄 Анализирую ваш текст...');

  try {
    // Обновляем историю, но ограничиваем длину (максимум 3000 символов)
    ctx.session.dialog += `\nПользователь: ${userMessage}`;
    if (ctx.session.dialog.length > 3000) {
      ctx.session.dialog = ctx.session.dialog.slice(-3000);
    }

    // Единый запрос к AI
    const messages = [
      { role: 'system', content: `Ты эксперт по итальянскому языку.  
        - Исправь ошибки в тексте пользователя.  
        - Объясни, какие правила были нарушены.  
        - Сформулируй креативный ответ на итальянском, чтобы поддержать разговор.  
        - Переведи этот ответ на русский.` },
      { role: 'user', content: `Текст: ${userMessage}` },
    ];

    const aiResponse = await getDeepSeekResponse(messages);
    if (!aiResponse) {
      await ctx.reply('❌ Не удалось обработать запрос. Попробуйте позже.');
      return;
    }

    // Добавляем ответ в историю
    ctx.session.dialog += `\nБот: ${aiResponse}`;
    if (ctx.session.dialog.length > 3000) {
      ctx.session.dialog = ctx.session.dialog.slice(-3000);
    }

    // Отправляем пользователю
    await ctx.reply(aiResponse, { parse_mode: 'Markdown' });

  } catch (e) {
    console.error('🚨 Ошибка при обработке сообщения:', e.message);
    await ctx.reply('❌ Произошла ошибка на сервере. Попробуйте позже.');
  }
});

// Запуск бота
bot.launch();

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
