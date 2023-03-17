const axios = require('axios');
const express = require('express');
const app = express();
require('dotenv').config(); // Load environment variables from .env file

// Load the environment variables
const uptimerobotApiKey = process.env.UPTIMEROBOT_API_KEY;
const instatusApiKey = process.env.INSTATUS_API_KEY;
const instatusPageId = process.env.INSTATUS_PAGE_ID;
const timeinterval = process.env.TIME_INTERVAL;

const monitorMap = JSON.parse(process.env.MONITOR_MAP);

// Set up a route for handling incoming HTTP requests
app.get('/', (req, res) => {
	// Return a success message if the server is running
	res.send('Started');
});

const updateComponents = async () => {
	try {
		console.log('Fetching monitor details from uptimerobot.com...');
		
		// Step 1: Get the monitor details from uptimerobot.com
		const monitorList = await axios.post('https://api.uptimerobot.com/v2/getMonitors', {
			api_key: uptimerobotApiKey,
			format: 'json',
			logs: 0,
		});
		console.log(`Fetched ${monitorList.data.monitors.length} monitors`);

		// Step 2: Loop through each monitor and get the relevant component from instatus.com
		console.log('Updating components in instatus.com');
		for (const monitor of monitorList.data.monitors) {
			const componentId = monitorMap[monitor.id]
			console.log(`Updating component for monitor ${monitor.friendly_name}...`);
			const component = await axios.get(`https://api.instatus.com/v1/${instatusPageId}/components/${componentId}`, {
				headers: {
					'Authorization': `Bearer ${instatusApiKey}`,
				},
			});

			// Step 3: Check if the component is Under Maintenance or not, and update it accordingly
			const status = monitor.status === 0 ? 'UNDERMAINTENANCE' : monitor.status === 2 ? 'OPERATIONAL' : monitor.status === 1 ? 'UNDERMAINTENANCE' : monitor.status === 8 ? 'PARTIALOUTAGE' : monitor.status === 9 ? 'MAJOROUTAGE' : '';
			console.log(`https://api.instatus.com/v1/${instatusPageId}/components/${componentId}`)
			console.log(status)
			await axios.put(`https://api.instatus.com/v1/${instatusPageId}/components/${componentId}`, {
				"status": status,
			}, {
				headers: {
					'Authorization': `Bearer ${instatusApiKey}`,
				},
			});
			console.log(`Component for monitor ${monitor.friendly_name + ' ' + componentId} updated to ${status}`);
		}

		// Return a success message if all updates were successful
		console.log('All components updated successfully');
	}
	catch (error) {
		// Return an error message if there was an issue with any of the requests
		console.error('Error updating components:', error.message);
	}
};

// Call the updateComponents function in timeinterval
setInterval(updateComponents, timeinterval);

// Start the server on port 3000
app.listen(3000, () => {
	console.log('Server started on port 3000');
})