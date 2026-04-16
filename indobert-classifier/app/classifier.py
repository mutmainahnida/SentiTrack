import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.config import BATCH_SIZE, DEVICE, MAX_LENGTH, MODEL_ID


class IndoBERTClassifier:
    def __init__(self) -> None:
        self._model = None
        self._tokenizer = None
        self._id2label: dict[str, str] = {}

    def load(self) -> None:
        """Load the model and tokenizer."""
        tok = AutoTokenizer.from_pretrained(MODEL_ID)
        mod = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
        mod.to(DEVICE)
        mod.eval()
        self._tokenizer = tok
        self._model = mod

        # Build label mapping with STRING keys so lookup works consistently
        config = mod.config
        if hasattr(config, "id2label") and config.id2label:
            self._id2label = {str(k): str(v) for k, v in config.id2label.items()}
        else:
            self._id2label = {}

    @property
    def is_loaded(self) -> bool:
        return self._model is not None and self._tokenizer is not None

    def _map_label(self, label_id: int | str, raw_label: str) -> tuple[str, float]:
        """
        Map a model output label to a sentiment string and confidence score.

        Handles two cases:
        1. The model's id2label is already a sentiment string (e.g. "negative", "neutral", "positive")
        2. Heuristic fallback: match raw_label against known sentiment keywords
        """
        label_str = str(label_id)
        # Case 1: id2label contains a known sentiment string
        if label_str in self._id2label:
            candidate = self._id2label[label_str].lower()
            if candidate in ("positive", "negative", "neutral"):
                return candidate, 1.0

        # Case 2: heuristic fallback
        raw = raw_label.lower()
        if raw in ("positive", "negative", "neutral"):
            return raw, 1.0
        if any(kw in raw for kw in ("pos", "good", "happy", "senang", "bahagia")):
            return "positive", 1.0
        if any(kw in raw for kw in ("neg", "bad", "sad", "marah", "sedih")):
            return "negative", 1.0
        return "neutral", 1.0

    def classify_batch(
        self, texts: list[str]
    ) -> list[tuple[str, float]]:
        """
        Classify a batch of texts.

        Returns a list of (sentiment, score) tuples.
        Handles empty input gracefully.
        """
        if not texts:
            return []

        # Tokenize in batches
        all_inputs = self._tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=MAX_LENGTH,
            return_tensors="pt",
        )
        all_inputs = {k: v.to(DEVICE) for k, v in all_inputs.items()}

        results: list[tuple[str, float]] = []

        for i in range(0, len(texts), BATCH_SIZE):
            batch_inputs = {
                k: v[i : i + BATCH_SIZE] for k, v in all_inputs.items()
            }
            with torch.no_grad():
                outputs = self._model(**batch_inputs)
                probs = torch.softmax(outputs.logits, dim=-1)

            for j in range(probs.size(0)):
                prob_tensor = probs[j]
                pred_id = int(prob_tensor.argmax().item())
                score = float(prob_tensor[pred_id].item())

                if self._id2label:
                    raw_label = self._id2label.get(str(pred_id), "")
                else:
                    raw_label = ""

                sentiment, _ = self._map_label(pred_id, raw_label)
                results.append((sentiment, score))

        return results


# Module-level singleton
_classifier: IndoBERTClassifier | None = None


def get_classifier() -> IndoBERTClassifier:
    global _classifier
    if _classifier is None:
        _classifier = IndoBERTClassifier()
        _classifier.load()
    return _classifier
