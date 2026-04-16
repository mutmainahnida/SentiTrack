const { Worker } = require('bullmq');
const Redis = require('ioredis');
const scraper = require('./scraper');

const worker = new Worker(
  'scrape',
  async (job) => {
    const { sentimentId, query, product, limit } = job.data;

    const redisHost = process.env.REDIS_HOST ?? 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const redis = new Redis({ host: redisHost, port: redisPort });
    const pubsub = new Redis({ host: redisHost, port: redisPort });

    try {
      const tweets = await scraper.searchTweets(query, limit, product);

      // Store intermediate state in Redis
      await redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'processing', tweets }),
      );

      // Publish result to channel
      await pubsub.publish(
        `ch:scrape:${sentimentId}`,
        JSON.stringify({ sentimentId, tweets }),
      );

      return { sentimentId, tweets };
    } catch (err) {
      const message = err.message ?? String(err);
      await redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'failed', errorMessage: message }),
      );
      await pubsub.publish(
        `ch:scrape:${sentimentId}`,
        JSON.stringify({ sentimentId, error: true, message, stage: 'scrape' }),
      );
      throw err;
    } finally {
      await redis.quit();
      await pubsub.quit();
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    concurrency: 1,
  },
);

worker.on('failed', (job, err) => {
  console.error(`Scrape job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
  console.log('Scraper worker ready, listening on queue: scrape');
});

module.exports = worker;
