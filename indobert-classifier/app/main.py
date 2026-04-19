import asyncio
import json
import logging
import os
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

from bullmq import Worker
import redis.asyncio as aioredis

from app.classifier import get_classifier
from app.config import DEVICE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))

classifier = None


async def process_job(job, token=None):
    global classifier
    sentiment_id = job.data["sentimentId"]
    query = job.data.get("query", "")
    tweets = job.data["tweets"]

    redis_conn = aioredis.from_url(REDIS_URL)
    pubsub_conn = aioredis.from_url(REDIS_URL)

    try:
        texts = [t["text"] for t in tweets]
        results = classifier.classify_batch(texts)

        tweets_with_sentiment = []
        for t, (sentiment, score) in zip(tweets, results):
            influence_score = (
                t.get("views", 0)
                + t.get("likes", 0) * 10
                + t.get("retweets", 0) * 20
                + t.get("replies", 0) * 15
            )
            tweets_with_sentiment.append({
                **t,
                "sentiment": sentiment,
                "sentimentScore": score,
                "influenceScore": influence_score,
            })

        total = len(tweets_with_sentiment)
        positive = round(sum(1 for t in tweets_with_sentiment if t["sentiment"] == "positive") / total * 100)
        negative = round(sum(1 for t in tweets_with_sentiment if t["sentiment"] == "negative") / total * 100)
        neutral = 100 - positive - negative

        top_influential = sorted(tweets_with_sentiment, key=lambda x: x["influenceScore"], reverse=True)[:10]

        result = {
            "query": query,
            "total": total,
            "summary": {"positive": positive, "negative": negative, "neutral": neutral},
            "topInfluential": top_influential,
            "tweets": tweets_with_sentiment,
            "completedAt": datetime.utcnow().isoformat() + "Z",
        }

        await redis_conn.setex(f"sentiment:{sentiment_id}", 3600, json.dumps({"status": "done", "result": result}))
        await pubsub_conn.publish(f"ch:classify:{sentiment_id}", json.dumps({"sentimentId": sentiment_id, "result": result}))
        return result

    except Exception as e:
        logger.exception("Classification error: %s", e)
        await redis_conn.setex(f"sentiment:{sentiment_id}", 3600, json.dumps({"status": "failed", "errorMessage": str(e)}))
        await pubsub_conn.publish(
            f"ch:classify:{sentiment_id}",
            json.dumps({"sentimentId": sentiment_id, "error": True, "message": str(e), "stage": "classify"})
        )
        raise

    finally:
        await redis_conn.aclose()
        await pubsub_conn.aclose()


async def start_worker():
    global classifier
    logger.info("Loading IndoBERT classifier...")
    classifier = get_classifier()
    logger.info("IndoBERT classifier loaded successfully.")

    worker = Worker(
        "classify",
        process_job,
        {
            "connection": {"host": REDIS_HOST, "port": REDIS_PORT},
            "concurrency": 1,
        },
    )

    def on_ready(_):
        print("IndoBERT worker ready, listening on queue: classify")

    worker.on("ready", on_ready)
    return worker


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  


def run_health():
    server = HTTPServer(("0.0.0.0", 8000), HealthHandler)
    server.serve_forever()


async def main():
    worker = await start_worker()
    await asyncio.Event().wait()  


if __name__ == "__main__":
    t = threading.Thread(target=run_health, daemon=True)
    t.start()
    asyncio.run(main())
