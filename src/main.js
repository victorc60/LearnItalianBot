import { Telegraf, session } from 'telegraf';
import axios from 'axios';
import config from 'config';

const bot = new Telegraf(config.TELEGRAM_TOKEN);
bot.use(session());

const INITIAL_SESSION = { dialog: [] };
const QUESTION_TOPICS = ["путешествия", "кулинария", "искусство", "музыка", "наука", "фильмы", "философия", "история", "спорт", "технологии"];
const axiosInstance = axios.create({ timeout: 10000 });

function getRandomTopic() {
  return QUESTION_TOPICS[Math.floor(Math.random() * QUESTION_TOPICS.length)];
}

async function getDeepSeekResponse(messages) {
  try {
    const response = await axiosInstance.post(
      'https://api.deepseek.com/v1/chat/completions',
      { model: 'deepseek-r1', messages: messages },
      { headers: { Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Ошибка при запросе к DeepSeek:', error.response?.data || error.message);
    throw error;
  }
}

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Привет! Давай попрактикуем итальянский. Напиши что-нибудь, и я помогу тебе с исправлениями, объясню ошибки и задам интересный вопрос! 🤖');
});

bot.on('text', async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  const userMessage = ctx.message.text;
  console.log(`💬 Сообщение от ${ctx.message.from.username || ctx.message.from.id}: ${userMessage}`);
  await ctx.reply('🔄 Думаю над вопросом и проверяю текст...');

  setTimeout(async () => {
    try {
      ctx.session.dialog.push({ role: 'user', content: userMessage });
      if (ctx.session.dialog.length > 5) ctx.session.dialog.shift();

      const topic = getRandomTopic();
      const messages = [
        { role: 'system', content: `Ты эксперт по итальянскому языку. Исправь ошибки в тексте пользователя, объясни правила, задай интересный вопрос по теме ${topic} и переведи вопрос на русский.` },
        { role: 'user', content: `Текст: ${userMessage}.` },
      ];

      const response = await getDeepSeekResponse(messages);
      ctx.session.dialog.push({ role: 'assistant', content: response });
      if (ctx.session.dialog.length > 5) ctx.session.dialog.shift();

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log('🚨 Ошибка при обработке сообщения:', e.message);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }, 500);
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
