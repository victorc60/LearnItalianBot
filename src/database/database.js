import { Sequelize } from 'sequelize';
import config from 'config';

const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'mysql',
  logging: false, // Отключаем логи SQL-запросов
});

export default sequelize;
