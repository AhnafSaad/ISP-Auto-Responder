require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { log } = require('./logger');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    }
});

const PROCESSED_FILE = 'processed_mails.json';

function loadProcessedMails() {
    if (fs.existsSync(PROCESSED_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PROCESSED_FILE));
        } catch (e) { return []; }
    }
    return [];
}

async function checkEmails() {
    log("--- Checking Inbox (Safe Mode) ---");
    let processedMails = loadProcessedMails();
    
    // আপনার নিজের ইমেইল আইডি যা লুপ বন্ধ করতে ব্যবহৃত হবে
    const myEmail = "ahnafsadik01857@gmail.com"; 

    try {
        const response = await axios.get('https://mail.google.com/mail/feed/atom', {
            auth: {
                username: process.env.EMAIL,
                password: process.env.APP_PASSWORD
            }
        });

        const data = response.data;
        const entries = data.split('<entry>');
        entries.shift();

        for (const entry of entries) {
            const mailIdMatch = entry.match(/<id>(.*?)<\/id>/);
            const rawMailId = mailIdMatch ? mailIdMatch[1] : null;
            
            const emailMatch = entry.match(/<email>(.*?)<\/email>/);
            const senderEmail = emailMatch ? emailMatch[1] : null;
            
            // ১. লুপ বন্ধ করার জন্য কন্ডিশন: যদি মেইলটি আপনার নিজের হয়, তবে ইগনোর করবে
            if (senderEmail === myEmail) {
                continue; 
            }

            const subjectMatch = entry.match(/<title>(.*?)<\/title>/);
            const originalSubject = subjectMatch ? subjectMatch[1] : "Request";
            const uniqueKey = `${senderEmail}_${originalSubject}`;

            // ২. ডুপ্লিকেট চেক: আইডি বা ইউনিক কি অলরেডি থাকলে স্কিপ করবে
            if (rawMailId && (processedMails.includes(rawMailId) || processedMails.includes(uniqueKey))) {
                continue;
            }

            const idMatch = entry.match(/ID-\d+/i);

            if (idMatch && senderEmail) {
                const clientId = idMatch[0].toUpperCase();
                const token = "TK-" + Math.floor(Math.random() * 90000 + 10000);

                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL,
                        to: senderEmail,
                        subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`,
                        text: `Hello,\n\nRegarding your request for ${clientId}, your support token is: ${token}.\n\nBest Regards,\nISP Support Automator`,
                        headers: {
                            'In-Reply-To': rawMailId, 
                            'References': rawMailId
                        }
                    });

                    log(`SUCCESS: Replied to ${senderEmail}`);
                    
                    processedMails.push(rawMailId);
                    processedMails.push(uniqueKey);
                    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedMails));

                } catch (mailErr) {
                    log(`Mail Error: ${mailErr.message}`);
                }
            }
        }
    } catch (err) {
        log(`System Error: ${err.message}`);
    }
    log("--- Session Finished ---");
}

setInterval(checkEmails, 60000); // প্রতি ১ মিনিট পর পর চেক করবে
checkEmails();