import { Telegraf, session } from 'telegraf';
import axios from 'axios';
import config from 'config';

// Инициализация бота
const bot = new Telegraf(config.TELEGRAM_TOKEN);

// Подключение middleware для сессий
bot.use(session());

// Инициализация сессии
const INITIAL_SESSION = {
  dialog: [], // История диалога
};

// Функция для запроса к DeepSeek API
async function getDeepSeekResponse(messages) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: messages,
      },
      {
        headers: {
          Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // Устанавливаем таймаут 30 секунд для предотвращения зависаний
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при запросе к DeepSeek:', error.response?.data || error.message);
    throw error;
  }
}

// Команда /start
bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Привет! Давай попрактикуем итальянский. Напиши что-нибудь, и я помогу тебе с исправлениями, объясню ошибки и задам интересный вопрос! 🤖');
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  ctx.session ??= INITIAL_SESSION;

  const userMessage = ctx.message.text;
  console.log(`💬 Сообщение от ${ctx.message.from.username || ctx.message.from.id}: ${userMessage}`);

  await ctx.reply('🔄 Думаю над ответом...');

  try {
    ctx.session.dialog.push({ role: 'user', content: userMessage });

    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift();
    }

    // Единый запрос к AI для исправления ошибок, генерации ответа и перевода
    const messages = [
      { role: 'system', content: `Ты эксперт по итальянскому языку и дружелюбный помощник. 
        - Исправь ошибки в тексте пользователя и объясни, какие правила были нарушены.
        - Сформулируй интересный креативный ответ на итальянском, чтобы поддержать разговор.
        - Переведи этот ответ на русский.` },
      { role: 'user', content: `Текст: ${userMessage}` },
    ];

    const aiResponse = await getDeepSeekResponse(messages);

    ctx.session.dialog.push({ role: 'assistant', content: aiResponse });
    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift();
    }

    await ctx.reply(aiResponse, { parse_mode: 'Markdown' });
  } catch (e) {
    console.log('🚨 Ошибка при обработке сообщения:', e.message);
    await ctx.reply('❌ Произошла ошибка на сервере. Попробуйте позже.');
  }
});

// Запуск бота
bot.launch();

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
