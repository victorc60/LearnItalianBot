import { DataTypes } from 'sequelize';
import sequelize from '../database/database.js';

const StudyPlan = sequelize.define('StudyPlan', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false },
  day: { type: DataTypes.INTEGER, allowNull: false },
  words: { type: DataTypes.TEXT, allowNull: false },
  grammar: { type: DataTypes.TEXT, allowNull: false },
  dialog: { type: DataTypes.TEXT, allowNull: false }
}, { timestamps: false });

export default StudyPlan;
