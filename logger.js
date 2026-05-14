const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'activity.log');

function log(message) {
    const timestamp = new Date().toLocaleString();
    const entry = `[${timestamp}] ${message}\n`;
    console.log(entry.trim()); 
    fs.appendFileSync(logFile, entry); 
}

module.exports = { log };