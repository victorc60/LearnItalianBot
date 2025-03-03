import { Telegraf, session } from 'telegraf';
import config from 'config';
import axios from 'axios'; // Используем axios для запросов к DeepSeek API

// Инициализация бота
const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

// Подключение middleware для сессий
bot.use(session());

// Инициализация сессии
const INITIAL_SESSION = {
  messages: [], // Массив для хранения истории сообщений
};

// Команда /new
bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION; // Сбрасываем сессию
  await ctx.reply('Сессия сброшена. Жду вашего сообщения!');
});

// Функция для отправки сообщений в DeepSeek и получения ответа
async function getDeepSeekResponse(userMessage) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions', // Уточни URL API DeepSeek
      {
        model: 'deepseek-chat', // Уточни модель DeepSeek
        messages: [
          { role: 'system', content: 'Ты дружелюбный и умный чат-бот.' },
          { role: 'user', content: userMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${config.get('DEEPSEEK_API_KEY')}`, // API ключ DeepSeek
          'Content-Type': 'application/json',
        },
      }
    );

    // Возвращаем текст ответа
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при запросе к DeepSeek:', error.response?.data || error.message);
    throw error; // Пробрасываем ошибку для обработки в основном коде
  }
}

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  // Инициализация сессии, если она не существует
  ctx.session ??= INITIAL_SESSION;

  const userMessage = ctx.message.text;
  console.log(`💬 Получено текстовое сообщение от ${ctx.message.from.username || ctx.message.from.id}: ${userMessage}`);

  try {
    // Уведомляем пользователя, что запрос обрабатывается
    await ctx.reply('🔄 Ваш запрос получен, ждите ответа...');

    // Получаем ответ от DeepSeek
    const aiResponse = await getDeepSeekResponse(userMessage);

    // Отправляем ответ пользователю
    await ctx.reply(aiResponse);
  } catch (e) {
    console.log('🚨 Ошибка при обработке текстового сообщения:', e.message);

    // Уведомляем пользователя об ошибке
    if (e.response?.data) {
      await ctx.reply(`❌ Ошибка API: ${e.response.data.error?.message || 'Неизвестная ошибка'}`);
    } else {
      await ctx.reply('❌ Произошла ошибка, попробуйте позже.');
    }
  }
});

// Команда /start
bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION; // Инициализируем сессию
  await ctx.reply('Привет! Задай мне вопрос, и я постараюсь на него ответить! 🤖');
});

// Запуск бота
bot.launch();

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));