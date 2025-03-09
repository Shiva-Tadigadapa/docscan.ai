const cron = require('node-cron');
const axios = require('axios');
// const config = require('../config/config');

// Schedule task to run at midnight every day
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily credit reset at midnight...');
    
    try {
        // Call the reset API endpoint
        const response = await axios.post(`localhost:3000/api/credits/reset/reset-all`);
        
        if (response.data.success) {
            console.log(`Credit reset successful: ${response.data.message}`);
        } else {
            console.error('Credit reset failed:', response.data.error);
        }
    } catch (error) {
        console.error('Error running credit reset cron job:', error.message);
    }
});

console.log('Credit reset cron job scheduled to run at midnight');