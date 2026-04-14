from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import yfinance as yf

# .envファイルから環境変数を読み込む
load_dotenv()

app = FastAPI()

API_KEY = os.getenv("API_KEY")
LAT = "34.512976"
LON = "135.792097"
FORECAST_URL = os.getenv("FORECAST_URL")
WEATHER_URL = os.getenv("WEATHER_URL")


# 現在の天気表示メソッド
@app.get("/api/weather")
async def get_weather():    
    # URLの定義
    url = WEATHER_URL + "?lat="+LAT+"&lon="+LON+"&appid="+API_KEY+"&units=metric&lang=ja"
    print("APIリクエスト開始: URL = "+url)
    
    # weather変数の初期化 (エラー発生時のデフォルト値)
    weather = {
        "condition": "取得中",
        "temperature": "--",
        "humidity": "--",
        "icon": "",
        "color": "#95a5a6"
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=30.0)) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            weather_data = response.json()
            
            # Map OpenWeatherMap API response to our app format
            icon_id = weather_data["weather"][0]["icon"]
            weather = {
                "condition": weather_data["weather"][0]["description"],
                "temperature": round(weather_data["main"]["temp"]),
                "humidity": weather_data["main"]["humidity"],
                "icon": f"https://openweathermap.org/img/wn/{icon_id}@2x.png",
                "color": "#ffffff" # 画像の背景色を設定
            }
        except Exception as e:
            print(f"Error fetching weather data: {repr(e)}")
    
    # 現在の時刻などの付加情報も入れるとフロントで表示しやすい
    return {
        "status": "success",
        "data": {
            **weather,
        },
        "timestamp": datetime.now().isoformat()
    }

#　3時間ごとの天気表示メソッド
@app.get("/api/forecast")
async def get_forecast():
    # URLの定義
    url = FORECAST_URL + "?lat="+LAT+"&lon="+LON+"&appid="+API_KEY+"&units=metric&lang=ja"
    print("APIリクエスト開始: URL = "+url)
    
    forecast_list = []

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=30.0)) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            forecastr_data = response.json()

            #タイムスタンプを変換
            tz = timezone(timedelta(hours=+9), "JST")
            for i in range(4):
                item = forecastr_data["list"][i]
                dt_val = item["dt"]

                # 日本時間に変更
                japan_time = str(datetime.fromtimestamp(dt_val, tz))[11:16]

                # 2. 天気情報の取得
                weather_info = item["weather"][0]
                owm_icon = weather_info["icon"]

                # 3. 気温・湿度の取得
                main_info = item["main"]

                # 降水確率の桁調整
                pop_percent = round(item.get("pop", 0) * 100)
                
                forecast_list.append({
                    "hour" : japan_time,                    # 3時間ごとの時間
                    "icon" : f"https://openweathermap.org/img/wn/{owm_icon}@2x.png",    # 天気アイコン画像URL
                    "color" : "#ffffff",                    # カラー（未使用にする場合でも念の為）
                    "temp": round(main_info["temp"]),       # 気温
                    "humidity": main_info["humidity"],      # 湿度
                    "pop" : pop_percent                     # 降水確率
                })

        except Exception as e:
            print(f"Error fetching weather data: {e}")
        return {
            "status": "success",
            "data": forecast_list,
            "timestamp": datetime.now().isoformat()
            }

#　為替レートの取得
@app.get("/api/rate")
async def get_rate():
    try:
        ticker = yf.Ticker("JPY=X") # USD/JPY
        # 1日分のデータを取得
        df = ticker.history(period="1d")
        
        if not df.empty:
            # 最新の終値
            current_rate = round(df['Close'].iloc[-1], 2)
            # 本日の始値
            open_rate = round(df['Open'].iloc[0], 2)
            # 変動幅
            exchange_change = round(current_rate - open_rate, 2)

            print(f"現在価格 = {current_rate}")
            print(f"変動幅 = {exchange_change}")
        else:
            # 取得失敗時のフォールバック
            current_rate, exchange_change = 0.0, 0.0
    except Exception as e:
        print(f"yfinance error: {e}")
        current_rate, exchange_change = 0.0, 0.0

    return {
        "status": "success",
        "data": {                       
            "exchange_rate": current_rate,      # 現在価格
            "exchange_change": exchange_change  # 変動幅
        },
        "timestamp": datetime.now().isoformat()
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
