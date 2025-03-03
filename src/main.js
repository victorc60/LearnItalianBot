import { Telegraf, session } from 'telegraf';
import 'dotenv/config'; // Подключаем dotenv для работы с переменными окружения
import axios from 'axios'; // Для запросов к DeepSeek API
import config from 'config';

// Инициализация бота
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Подключение middleware для сессий
bot.use(session());

// Инициализация сессии
const INITIAL_SESSION = {
  dialog: [], // Массив для хранения истории диалога
};

// Функция для отправки запросов к DeepSeek API
async function getDeepSeekResponse(messages) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions', // Уточни URL API DeepSeek
      {
        model: 'deepseek-chat', // Уточни модель DeepSeek
        messages: messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, // API ключ DeepSeek
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

// Команда /start
bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION; // Инициализируем сессию
  await ctx.reply('Привет! Давай попрактикуем итальянский. Напиши что-нибудь, и я задам тебе интересные вопросы! 🤖');
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  // Инициализация сессии, если она не существует
  ctx.session ??= INITIAL_SESSION;

  const userMessage = ctx.message.text;
  console.log(`💬 Получено сообщение от ${ctx.message.from.username || ctx.message.from.id}: ${userMessage}`);

  try {
    // Добавляем сообщение пользователя в историю диалога
    ctx.session.dialog.push({ role: 'user', content: userMessage });

    // Удаляем самое старое сообщение, если история превышает 10 сообщений
    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift(); // Удаляем самое старое сообщение
    }

    // Уведомляем пользователя, что запрос обрабатывается
    await ctx.reply('🔄 Думаю над вопросом...');

    // Генерируем вопрос с учетом контекста
    const messages = [
      { role: 'system', content: 'Ты дружелюбный и умный чат-бот, который помогает изучать итальянский язык. Задавай интересные вопросы на итальянском, чтобы поддержать диалог.' },
      ...ctx.session.dialog, // Включаем историю диалога
      { role: 'user', content: 'Задай мне интересный вопрос на итальянском, чтобы продолжить разговор.' },
    ];

    const aiResponse = await getDeepSeekResponse(messages);

    // Добавляем ответ бота в историю диалога
    ctx.session.dialog.push({ role: 'assistant', content: aiResponse });

    // Удаляем самое старое сообщение, если история превышает 10 сообщений
    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift(); // Удаляем самое старое сообщение
    }

    // Отправляем вопрос пользователю
    await ctx.reply(aiResponse);
  } catch (e) {
    console.log('🚨 Ошибка при обработке сообщения:', e.message);
    await ctx.reply('❌ Произошла ошибка, попробуйте позже.');
  }
});

// Запуск бота
bot.launch();

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
