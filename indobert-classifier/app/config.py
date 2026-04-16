import os

MODEL_ID = os.getenv("MODEL_ID", "Aardiiiiy/indobertweet-base-Indonesian-sentiment-analysis")
DEVICE = os.getenv("DEVICE", "cuda" if __import__("torch").cuda.is_available() else "cpu")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "128"))
