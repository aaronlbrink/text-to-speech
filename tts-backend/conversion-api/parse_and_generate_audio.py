import os
import uuid

import soundfile as sf
from celery import shared_task
from celery.result import AsyncResult
from kokoro import KPipeline
from pydub import AudioSegment

server_base = "__website__"
@shared_task(ignore_result=False, serializer="json")
def parse_and_generate_audio(content) -> int:
    text = content["article"]
    file_id = uuid.uuid4()
    pipeline = KPipeline(lang_code="a", device="cuda")
    generator = pipeline(text, voice="af_heart", speed=1, split_pattern=r"\n+")
    count = 0
    if not os.path.exists(f"/tmp/{file_id}"):
        os.makedirs(f"/tmp/{file_id}")
    for i, (_, _, audio) in enumerate(generator):
        count += 1
        sf.write(f"/tmp/{file_id}/{i}.wav", audio, 24000)

    sounds = []
    for i in range(0, count):
        sounds.append(AudioSegment.from_file(f"/tmp/{file_id}/{i}.wav", format="wav"))

    output = AudioSegment.empty()
    for segment in sounds:
        output += segment
    file_handle = output.export(f"public/audio/{file_id}.mp3", format="mp3")
    return f"https://{server_base}/audio/{file_id}.mp3"
