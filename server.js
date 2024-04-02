
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const SpeedTest = require('fast-speedtest-api');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
const path = require('path');


// defining the schema for the SpeedTestData model
const speedTestDataSchema = new mongoose.Schema({
  speedMbps: Number,
  timestamp: { type: Date, default: Date.now }
});

const SpeedTestData = mongoose.model('SpeedTestData', speedTestDataSchema);

const FAST_APP_TOKEN = 'YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm';

mongoose.connect('mongodb://localhost/network_speed_monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.get('/speedtest', async (req, res) => {
  try {
    const data = await SpeedTestData.find().select('speedMbps timestamp').exec();
    res.json(data);
  } catch (error) {
    console.error('Error retrieving speed test data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
 

app.get('/mynet', (req, res) => {
  console.log('Request received for the root URL');
  res.sendFile(path.join(__dirname, 'index.html'));
});

const runSpeedTest = async () => {
  try {
    const speedTest = new SpeedTest({ maxTime: 5000, token: FAST_APP_TOKEN });
    console.log('Running speed test...');
    const data = await speedTest.getSpeed();
    console.log('Speed test data:', data);

    if (data) {
      console.log('Total speed:', data);
      if (typeof data !== 'undefined') {
        // converting bytes to megabits per second (Mbps)
        const speedMbps = data * 8 / (1024 * 1024);
        
        console.log('Speed test completed. Speed: ', speedMbps.toFixed(2), ' Mbps');
        
        const speedTestData = new SpeedTestData({
          speedMbps
        });
        await speedTestData.save();
      } else {
        console.error('Error: Speed is undefined');
      }
    } else {
      console.error('Error: Speed test data is undefined');
    }
  } catch (err) {
    console.error('Error running speed test:', err);
  }
};

runSpeedTest();

// I run speed test every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running speed test...');
  await runSpeedTest();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
