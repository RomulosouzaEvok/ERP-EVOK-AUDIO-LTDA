const DashboardService = require('../services/dashboardService');

exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = await DashboardService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

