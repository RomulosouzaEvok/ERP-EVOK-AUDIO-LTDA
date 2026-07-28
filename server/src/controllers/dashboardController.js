const DashboardService = require('../services/dashboardService');

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await DashboardService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

