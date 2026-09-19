module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Loans', 'lateDueInterestRate', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('Loans', 'lateDueInterest', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('Loans', 'lateDueFee', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('Loans', 'totalLateDueAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('Loans', 'daysOverdue', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('Loans', 'lateDueAppliedAt', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Loans', 'lateDueInterestRate');
    await queryInterface.removeColumn('Loans', 'lateDueInterest');
    await queryInterface.removeColumn('Loans', 'lateDueFee');
    await queryInterface.removeColumn('Loans', 'totalLateDueAmount');
    await queryInterface.removeColumn('Loans', 'daysOverdue');
    await queryInterface.removeColumn('Loans', 'lateDueAppliedAt');
  }
};
