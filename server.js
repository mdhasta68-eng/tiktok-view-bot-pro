const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const PORT = process.env.PORT || 3000;

// হেলথ চেক
app.get('/', (req, res) => {
    res.json({ status: '✅ OMEGA ভিউ বুস্টার লাইভ' });
});

// ভিউ পাঠানোর এন্ডপয়েন্ট
app.post('/boost-views', async (req, res) => {
    const { videoUrl, count = 10 } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'videoUrl দিতে হবে' });
    }

    if (count > 200) {
        return res.status(400).json({ error: 'একবারে সর্বোচ্চ ২০০ ভিউ পাঠাতে পারো' });
    }

    const results = [];

    for (let i = 0; i < count; i++) {
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080'
                ]
            });

            const page = await browser.newPage();

            // র‍্যান্ডম ইউজার এজেন্ট
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.0.0 Safari/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Version/16.6 Mobile/15E148 Safari/604.1'
            ];
            await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);

            // ভিউ কাউন্ট ট্রিগার করতে পেজ লোড কর
            await page.goto(videoUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // স্ক্রল কর—যেন টিকটক ভিউ ধরে
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });

            await page.waitForTimeout(3000 + Math.random() * 2000);

            await browser.close();

            results.push({ attempt: i + 1, status: 'view_sent' });
            console.log(`✅ ভিউ ${i + 1}/${count} পাঠানো হয়েছে`);

            // প্রতিবারের মাঝে গ্যাপ—যেন ট্রেস না ধরে
            await new Promise(r => setTimeout(r, 4000 + Math.random() * 3000));

        } catch (error) {
            results.push({ attempt: i + 1, status: 'failed', error: error.message });
            console.log(`❌ ভিউ ${i + 1} ব্যর্থ: ${error.message}`);
        }
    }

    res.json({
        success: true,
        videoUrl,
        total: count,
        results
    });
});

app.listen(PORT, () => console.log(`🔥 ভিউ বুস্টার চলছে পোর্ট ${PORT}-এ`));