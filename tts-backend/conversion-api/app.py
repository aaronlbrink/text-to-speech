import soundfile as sf
import torch
from celery import shared_task
from celery.result import AsyncResult
from celery_flask import create_app
from flask import Blueprint, Flask, request, send_file
from flask_cors import CORS, cross_origin
from kokoro import KPipeline
from parse_and_generate_audio import parse_and_generate_audio
from pydub import AudioSegment

torch.multiprocessing.set_start_method("spawn", force=True)
torch.backends.nnpack.enabled = False
print(torch.cuda.get_device_name(0))

flask_app = create_app()
celery_app = flask_app.extensions["celery"]

tta = Blueprint('tta', __name__, url_prefix='/tta')
v1 = Blueprint('v1', __name__, url_prefix='/v1')

CORS(flask_app, headers="Content-Type")

@v1.route("/health")
def health():
    return "OK"

@v1.get("/conversion-task/<id>")
@cross_origin()
def task_result(id: str) -> dict[str, object]:
    result = AsyncResult(id)
    return {
        "ready": result.ready(),
        "successful": result.successful(),
        "value": result.result if result.ready() else None,
    }

@v1.post("") # if this is a slash, "/", a CORS error occurs
def digest():
    content = request.get_json(silent=True, force=True)
    result = parse_and_generate_audio.delay(content)
    return {"result_id": result.id}

@v1.post("/chunk")
def chunk():
    content = request.get_json(silent=True, force=True)
    article = content["article"]

tta.register_blueprint(v1)
flask_app.register_blueprint(tta)
# flask_app.register_blueprint(v1, url_prefix="/") # creates problems for celery
