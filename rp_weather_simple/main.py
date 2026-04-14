from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import random
import datetime
import os

app = FastAPI()

# 天気用のダミーデータセット(現在の天気にそぐわないアイコンでテスト)
DUMMY_WEATHER_DATA = [
    {"condition": "晴れ", "temperature": 25, "icon": "sun", "color": "#f1c40f"},
    {"condition": "曇り", "temperature": 20, "icon": "cloud", "color": "#95a5a6"},
    {"condition": "雨", "temperature": 18, "icon": "cloud-rain", "color": "#3498db"},
]

@app.get("/api/weather")
async def get_weather():
    # 本来はここでOpenWeatherMapなどのAPIを呼び出す
    weather = random.choice(DUMMY_WEATHER_DATA)
    # 現在の時刻などの付加情報も入れるとフロントで表示しやすい
    return {
        "status": "success",
        "data": weather,
        "timestamp": datetime.datetime.now().isoformat()
    }

# staticディレクトリの確保とマウント
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    # ルートパスにアクセスした場合は、index.html を返す
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    return HTMLResponse(content="<h1>index.html not found</h1>", status_code=404)

if __name__ == "__main__":
    import uvicorn
    # hostを0.0.0.0にして他の端末からもアクセスできるようにする
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
