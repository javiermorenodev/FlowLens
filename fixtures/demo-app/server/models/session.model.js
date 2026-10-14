const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define('Session', {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: DataTypes.INTEGER,
    expiresAt: DataTypes.DATE,
  });
