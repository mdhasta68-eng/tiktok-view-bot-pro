const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(express.json());

// CORS — সব অনুমতি
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const PORT = process.env.PORT || 3000;

// ========== প্রক্সি লিস্ট লোড ==========
let proxies = [];
try {
    const data = fs.readFileSync('proxies.txt', 'utf8');
    proxies = data.split('\n').filter(line => line.trim().length > 0);
    console.log(`✅ ${proxies.length}টি প্রক্সি লোড হয়েছে`);
} catch (e) {
    console.log('ℹ️ proxies.txt নেই — ডিরেক্ট মোডে চলবে');
}

// ========== ইউজার এজেন্ট পুল ==========
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

// ========== হেল্পার ফাংশন ==========
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== একক ভিউ ফাংশন ==========
async function sendView(videoUrl, proxy = null) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080',
            ...(proxy ? [`--proxy-server=${proxy}`] : [])
        ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(randomItem(userAgents));

    // ভিউ পেজে যাও
    await page.goto(videoUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
    });

    // স্ক্রল সিমুলেশন
    await page.evaluate(async () => {
        for (let i = 0; i < 4; i++) {
            window.scrollBy(0, window.innerHeight * 0.7);
            await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
        }
    });

    // থাম — যেন টিকটক ভিউ কাউন্ট করে
    await sleep(5000 + Math.random() * 5000);

    await browser.close();
    return true;
}

// ========== হেলথ চেক ==========
app.get('/', (req, res) => {
    res.json({
        status: '✅ OMEGA ভিউ বুস্টার লাইভ',
        proxies: proxies.length,
        mode: proxies.length > 0 ? 'proxy' : 'direct',
        time: new Date().toISOString()
    });
});

// ========== মেইন এন্ডপয়েন্ট ==========
app.post('/boost-views', async (req, res) => {
    const { videoUrl, count = 20, parallel = 5 } = req.body;

    // ভ্যালিডেশন
    if (!videoUrl) {
        return res.status(400).json({ error: 'videoUrl দিতে হবে' });
    }
    if (count < 1 || count > 500) {
        return res.status(400).json({ error: 'count ১-৫০০ এর মধ্যে হতে হবে' });
    }
    if (parallel < 1 || parallel > 20) {
        return res.status(400).json({ error: 'parallel ১-২০ এর মধ্যে হতে হবে' });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // টাস্ক জেনারেট
    const tasks = [];
    for (let i = 0; i < count; i++) {
        const proxy = proxies.length > 0 ? randomItem(proxies) : null;
        tasks.push({
            id: i + 1,
            proxy: proxy,
            run: async () => {
                try {
                    await sendView(videoUrl, proxy);
                    return { id: i + 1, status: 'view_sent', proxy: proxy || 'direct' };
                } catch (err) {
                    return { id: i + 1, status: 'failed', error: err.message, proxy: proxy || 'direct' };
                }
            }
        });
    }

    // প্যারালাল ওয়ার্কার
    async function worker(iterator) {
        for (const task of iterator) {
            const result = await task.run();
            results.push(result);
            if (result.status === 'view_sent') successCount++;
            else failCount++;
            console.log(`📊 অগ্রগতি: ${successCount + failCount}/${count} | সফল: ${successCount} | ব্যর্থ: ${failCount}`);
            await sleep(3000 + Math.random() * 4000);
        }
    }

    const iterator = tasks[Symbol.iterator]();
    const workers = [];
    const poolSize = Math.min(parallel, tasks.length);
    for (let i = 0; i < poolSize; i++) {
        workers.push(worker(iterator));
    }
    await Promise.all(workers);

    res.json({
        success: true,
        videoUrl,
        total: count,
        successCount,
        failCount,
        results
    });
});

// ========== সার্ভার চালু ==========
app.listen(PORT, () => {
    console.log(`🔥 OMEGA ভュー বুস্টার চলছে পোর্ট ${PORT}-এ`);
    console.log(`📡 প্রক্সি মোড: ${proxies.length > 0 ? 'ON' : 'OFF (direct)'}`);
});
