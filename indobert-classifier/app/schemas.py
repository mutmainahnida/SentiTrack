from pydantic import BaseModel


class TweetInput(BaseModel):
    id: str
    text: str
    username: str
    views: int = 0
    likes: int = 0
    retweets: int = 0
    replies: int = 0


class ClassifyRequest(BaseModel):
    tweets: list[TweetInput]
    jobId: str


class ClassificationResult(BaseModel):
    id: str
    sentiment: str  # "positive" | "negative" | "neutral"
    score: float   # 0.0 to 1.0


class ClassifyResponse(BaseModel):
    jobId: str
    results: list[ClassificationResult]
    model: str
    processingTimeMs: int
