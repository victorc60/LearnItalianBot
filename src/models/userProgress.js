import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

const UserProgress = sequelize.define('UserProgress', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false },
  current_day: { type: DataTypes.INTEGER, defaultValue: 1 },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

export default UserProgress;
