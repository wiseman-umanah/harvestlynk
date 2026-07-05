# ai_crop_handler

Standalone FastAPI crop disease classification service for HarvestLynk. Accepts an uploaded crop image, runs inference against a TensorFlow model, and returns the predicted disease, confidence score, symptoms, cause, treatment, and prevention advice.

---

## Requirements

- Python 3.13+
- [`uv`](https://docs.astral.sh/uv/) package manager

---

## Setup

```bash
cd ai_crop_handler
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The service starts on `http://localhost:8000`.

The TensorFlow model file must exist at:

```
ai_crop_handler/models/best_crop_disease_model.h5
```

The model is loaded once at startup into `app.state.model`. If the file is missing or fails to load, the service still starts but all `/predict` calls will fail.

---

## API

### `POST /predict`

Classifies a crop image for disease.

**Request:** `multipart/form-data` with a single file field `file` (JPEG, PNG, or any PIL-supported format).

**Response:**

```json
{
  "filename": "leaf.jpg",
  "prediction": "Tomato Late Blight",
  "confidence": 0.94,
  "status": "completed",
  "treatment": {
    "symptoms": "...",
    "cause": "...",
    "treatment": "...",
    "prevention": "..."
  }
}
```

| Field | Type | Description |
|---|---|---|
| `filename` | string | Original uploaded filename |
| `prediction` | string | Predicted disease class name |
| `confidence` | float | Model confidence (0–1) |
| `status` | string | `completed` on success, `failed` on model error |
| `treatment` | object | Symptoms, cause, treatment steps, and prevention advice |

**Errors:**

| Status | Condition |
|---|---|
| `400` | No file uploaded or file cannot be read as an image |
| `500` | Model not loaded or inference error |

---

## Model

- File: `models/best_crop_disease_model.h5`
- Framework: TensorFlow / Keras (CPU build)
- Input: RGB image resized to **224×224**
- Output: softmax class probabilities over all disease classes

Class names and treatment data are defined in `data.py` as `CLASS_NAMES` (list of strings in model output order) and `TREATMENTS` (dict mapping class name → treatment info). Do not reorder `CLASS_NAMES` without retraining the model.

---

## CORS

The service allows requests from:
- `http://localhost:3000` (local dashboard dev)
- `https://app-harvestlynk.vercel.app` (production dashboard)

Update `origins` in `main.py` if you deploy the dashboard to a different domain.

---

## Dashboard Integration

The dashboard calls this service directly from the browser:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The farmer AI Crop Doctor page (`dashboard/src/app/dashboard/farmer/ai-crop-doctor/page.tsx`) posts the image to `${NEXT_PUBLIC_API_URL}/predict` and then persists the scan result to the Express API via `scansApi.createScan`. The Express backend does **not** call this service itself.

---

## Tech Stack

| Technology | Version |
|---|---|
| Python | 3.13+ |
| FastAPI | 0.136+ |
| TensorFlow (CPU) | 2.21+ |
| Pillow | 12+ |
| uvicorn | 0.46+ |
| pydantic | 2.13+ |
| loguru | 0.7+ |
