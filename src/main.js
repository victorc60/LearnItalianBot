import { Telegraf, session } from 'telegraf';
import axios from 'axios'; // Для запросов к DeepSeek API
import config from 'config'; // Для загрузки конфигурации

// Инициализация бота
const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

// Подключение middleware для сессий
bot.use(session());

// Инициализация сессии
const INITIAL_SESSION = {
  dialog: [], // Массив для хранения истории диалога
  lastError: null, // Последняя найденная ошибка
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

// Функция для проверки грамматики
async function checkGrammar(userMessage) {
  const messages = [
    {
      role: 'system',
      content: 'Ты дружелюбный и умный чат-бот, который помогает изучать итальянский язык. Проверь текст на ошибки, исправь их и объясни правила.',
    },
    { role: 'user', content: `Проверь текст на ошибки: "${userMessage}"` },
  ];

  return await getDeepSeekResponse(messages);
}

// Функция для генерации интересного вопроса
async function generateQuestion() {
  const messages = [
    {
      role: 'system',
      content: 'Ты дружелюбный и умный чат-бот, который помогает изучать итальянский язык. Задавай интересные вопросы на итальянском, чтобы поддержать диалог.',
    },
    { role: 'user', content: 'Задай мне интересный вопрос на итальянском, чтобы продолжить разговор.' },
  ];

  return await getDeepSeekResponse(messages);
}

// Команда /start
bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION; // Инициализируем сессию
  await ctx.reply('Привет! Давай попрактикуем итальянский. Напиши что-нибудь, и я помогу тебе с грамматикой и задам интересные вопросы! 🤖');
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  // Инициализация сессии, если она не существует
  ctx.session ??= INITIAL_SESSION;

  const userMessage = ctx.message.text;
  console.log(`💬 Получено сообщение от ${ctx.message.from.username || ctx.message.from.id}: ${userMessage}`);

  try {
    // Проверяем текст на ошибки
    const grammarCheckResponse = await checkGrammar(userMessage);

    // Если найдены ошибки
    if (grammarCheckResponse.includes('Ошибка') || grammarCheckResponse.includes('исправление')) {
      await ctx.reply(`🔍 Результат проверки:\n\n${grammarCheckResponse}`);
    } else {
      // Если ошибок нет
      await ctx.reply('✅ Отлично! Ошибок не найдено. Продолжаем разговор!');
    }

    // Генерируем интересный вопрос
    const question = await generateQuestion();

    // Добавляем вопрос в историю диалога
    ctx.session.dialog.push({ role: 'assistant', content: question });

    // Удаляем самое старое сообщение, если история превышает 10 сообщений
    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift(); // Удаляем самое старое сообщение
    }

    // Отправляем вопрос пользователю
    await ctx.reply(question);
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
