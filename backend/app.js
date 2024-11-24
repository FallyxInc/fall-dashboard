const express = require('express');
const bodyParser = require('body-parser');
const retirementHomesRoutes = require('./routes/retirementHomes');
const fallEventsRoutes = require('./routes/fallEvents');

const app = express();
const PORT = 8000;

// 中间件
app.use(bodyParser.json());

// 路由
app.use('/api/retirement_homes', retirementHomesRoutes);
app.use('/api/fall_events', fallEventsRoutes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
