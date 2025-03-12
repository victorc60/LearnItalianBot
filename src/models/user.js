import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING },
    level: { type: DataTypes.STRING, defaultValue: 'A1' },
  });
  

export default User;
