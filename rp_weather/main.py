from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import yfinance as yf
import requests
from loguru import logger
import sys

# 既存のハンドラを削除
logger.remove()

# コンソール出力の設定を修正（<short_tuple> を削除し、標準的な形式に変更）
logger.add(
    sys.stdout, 
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    colorize=True
)

# ファイル出力の設定
logger.add("logs/fastapi.log", rotation="1 MB", retention="10 days", level="INFO")

# .envファイルから環境変数の読み込み
load_dotenv()

app = FastAPI()

API_KEY = os.getenv("API_KEY")
LAT = "34.512976"
LON = "135.792097"
FORECAST_URL = os.getenv("FORECAST_URL")
WEATHER_URL = os.getenv("WEATHER_URL")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

#　現在のエントリー価格を読み取り
def get_saved_entry_price():
    start_time = datetime.now()
    logger.info(f"[{start_time}] エントリー価格の読み取りを開始します。")
    try:
        if os.path.exists("entry_price.txt"):
            with open("entry_price.txt", "r") as f:
                content = f.read().strip()
                # 中身が空文字列でない場合のみ数値に変換
                if content:
                    return float(content)
    except Exception as e:
        logger.error(f"ファイル読み込みエラー: {e}")
    return None

# 前回実行時の価格を読み書き
def get_set_last_price(current_price):
    start_time = datetime.now()
    logger.info(f"[{start_time}] エントリー価格の読み書きを開始します。")

    last_price = None
    if os.path.exists("last_price.txt"):
        with open("last_price.txt", "r") as f:
            try:
                last_price = float(f.read().strip())
            except: last_price = None
    
    # 今回の価格を保存
    with open("last_price.txt", "w") as f:
        f.write(str(current_price))
    
    return last_price


# 現在の天気表示メソッド
@app.get("/api/weather")
async def get_weather():
    start_time = datetime.now()
    logger.info(f"[{start_time}] 天気情報リクエストを受信しました。")

    # URLの定義
    url = WEATHER_URL + "?lat="+LAT+"&lon="+LON+"&appid="+API_KEY+"&units=metric&lang=ja"
    logger.info("APIリクエスト開始: URL = "+url)
    
    # weather変数の初期化
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
            logger.success("天気APIの取得に成功しました。")

            weather_data = response.json()
            
            icon_id = weather_data["weather"][0]["icon"]
            weather = {
                "condition": weather_data["weather"][0]["description"],
                "temperature": round(weather_data["main"]["temp"]),
                "humidity": weather_data["main"]["humidity"],
                "icon": f"https://openweathermap.org/img/wn/{icon_id}@2x.png",
                "color": "#ffffff" # 画像の背景色を設定
            }
        except Exception as e:
            logger.error(f"天気データ取得失敗: {repr(e)}")
    
    # 画面側に返却
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
    start_time = datetime.now()
    logger.info(f"[{start_time}] 3時間ごとの天気情報リクエストを受信しました。")

    # URLの定義
    url = FORECAST_URL + "?lat="+LAT+"&lon="+LON+"&appid="+API_KEY+"&units=metric&lang=ja"
    logger.info("APIリクエスト開始: URL = "+url)
    
    # リストの初期化
    forecast_list = []

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=30.0)) as client:
        try:
            response = await client.get(url)
            response.raise_for_status() 
            logger.success("3時間ごとの天気APIの取得に成功しました。")
            
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
                    "hour" : japan_time,                                                # 3時間ごとの時間
                    "icon" : f"https://openweathermap.org/img/wn/{owm_icon}@2x.png",    # 天気アイコン画像URL
                    "color" : "#ffffff",                                                # カラー
                    "temp": round(main_info["temp"]),                                   # 気温
                    "humidity": main_info["humidity"],                                  # 湿度
                    "pop" : pop_percent                                                 # 降水確率
                })

        except Exception as e:
            logger.error(f"3時間ごとの天気データ取得失敗: {repr(e)}")
        # 画面側に返却
        return {
            "status": "success",
            "data": forecast_list,
            "timestamp": datetime.now().isoformat()
            }

#　為替レートの取得
@app.get("/api/rate")
async def get_rate():
    start_time = datetime.now()
    logger.info(f"[{start_time}] 為替レート取得 & Discord通知処理を開始します。")
    try:
        # 為替データの取得 (yfinance)
        ticker = yf.Ticker("JPY=X")
        df = ticker.history(period="1d")
        
        if df.empty:
            logger.warning("yfinanceからデータを取得できませんでした。")
            return {"status": "error", "message": "Failed to fetch rate"}

        # GASのcurrentAskに相当（最新の終値）
        current_ask = round(df['Close'].iloc[-1], 3)
        logger.info(f"最新価格取得: {current_ask}")
        
        # 1. 前回値との比較
        last_ask = get_set_last_price(current_ask)
        diff_text = ""
        if last_ask:
            diff = current_ask - last_ask
            diff_text = f"{'+' if diff >= 0 else ''}{diff:.3f}"

        # 2. エントリー価格との比較
        entry_price = get_saved_entry_price()
        position_section = ""
        if entry_price and entry_price != 0:
            entry_diff = current_ask - entry_price
            entry_diff_icon = "📈 +" if entry_diff >= 0 else "📉 "
            position_section = (
                f"💰 **ポジション損益状況**\n"
                f"保有単価： {entry_price:.3f}\n"
                f"損益幅　： {entry_diff_icon}{entry_diff:.3f}\n"
                f"--------------------------------\n"
            )

        # 3. Discord用メッセージの構築
        format_date = datetime.now().strftime('%Y/%m/%d %H:%M:%S')
        
        # yfinanceのデータから簡易リスト作成 (GASのpriceText相当)
        # 始値、高値、安値をリスト化
        open_p = df['Open'].iloc[0]
        high_p = df['High'].max()
        low_p = df['Low'].min()
        
        price_text = (
            f"始値：{open_p:.3f}\n"
            f"高値：{high_p:.3f}\n"
            f"安値：{low_p:.3f}"
        )

        content = (
            f"{position_section}"
            f"📈 現在価格（買値）： {current_ask:.3f}\n"
            f"🔄 前回比（前回実行時）： {diff_text}\n\n"
            f"💱 **USD/JPY 為替通知**\n"
            f"📅 取得日時：{format_date}\n"
            f"--------------------------------\n"
            f"{price_text}\n"
            f"--------------------------------"
        )

        # Discordへ送信
        payload = {"content": content}
        res = requests.post(os.getenv("DISCORD_WEBHOOK_URL"), json=payload)
        if res.status_code == 204:
            logger.success("Discordへの通知が正常に完了しました。")
        else:
            logger.error(f"Discord通知失敗: Status {res.status_code}")

        return {
            "status": "success",
            "data": {
                "exchange_rate": current_ask,
                "exchange_diff": diff
            },
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.critical(f"レート取得処理で致命的なエラー: {e}")
        return {"status": "error", "message": str(e)}


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
