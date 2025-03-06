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

// Темы для креативных вопросов
const QUESTION_TOPICS = [
  "путешествия",
  "кулинария",
  "искусство",
  "музыка",
  "наука",
  "фильмы",
  "философия",
  "история",
  "спорт",
  "технологии",
];

// Функция для выбора случайной темы
function getRandomTopic() {
  return QUESTION_TOPICS[Math.floor(Math.random() * QUESTION_TOPICS.length)];
}

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

  // Уведомляем пользователя, что бот думает над ответом
  await ctx.reply('🔄 Думаю над вопросом и проверяю текст...');

  try {
    // Добавляем сообщение пользователя в историю
    ctx.session.dialog.push({ role: 'user', content: userMessage });

    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift();
    }

    // **1. Исправление ошибок и объяснение правил**
    const correctionMessages = [
      { role: 'system', content: 'Ты эксперт по итальянскому языку. Исправь ошибки в тексте пользователя и объясни, какие правила были нарушены.' },
      { role: 'user', content: `Исправь ошибки в этом тексте и объясни правила: ${userMessage}` },
    ];

    const correctionResponse = await getDeepSeekResponse(correctionMessages);

    // **2. Генерация интересного вопроса**
    const topic = getRandomTopic();
    const questionMessages = [
      { role: 'system', content: `Ты дружелюбный и умный чат-бот, который помогает изучать итальянский язык. 
      Задавай интересные и креативные вопросы на итальянском по разным темам, чтобы поддержать диалог. 
      Сейчас выбери тему: ${topic} и задай по ней вопрос.` },
      ...ctx.session.dialog,
      { role: 'user', content: `Задай мне интересный вопрос на итальянском по теме ${topic}, чтобы продолжить разговор.` },
    ];

    const questionResponse = await getDeepSeekResponse(questionMessages);

    // **3. Перевод на русский язык**
    const translationMessages = [
      { role: 'system', content: 'Ты профессиональный переводчик. Переведи этот итальянский текст на русский язык.' },
      { role: 'user', content: `Переведи на русский: ${questionResponse}` },
    ];

    const translatedResponse = await getDeepSeekResponse(translationMessages);

    // **Формируем финальный ответ**
    const finalResponse = `📌 *Исправления и объяснение ошибок:*  
${correctionResponse}  

💡 *Интересный вопрос по теме "${topic}":*  
${questionResponse}  

📖 *Перевод на русский:*  
${translatedResponse}`;

    // Добавляем ответ бота в историю
    ctx.session.dialog.push({ role: 'assistant', content: questionResponse });

    if (ctx.session.dialog.length > 10) {
      ctx.session.dialog.shift();
    }

    // Отправляем ответ пользователю
    await ctx.reply(finalResponse, { parse_mode: 'Markdown' });

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
