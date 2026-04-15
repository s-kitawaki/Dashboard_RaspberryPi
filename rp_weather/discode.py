import discord
from discord.ext import commands
from dotenv import load_dotenv
import os
from datetime import datetime
from loguru import logger

# ログ設定
logger.add("logs/discord_bot.log", rotation="1 MB", retention="10 days", level="INFO")

# .envファイルから環境変数の読み込み
load_dotenv()

# Botのトークンと権限設定
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    logger.info(f"Botが起動しました: {bot.user.name}")

# エントリー価格を保存
@bot.command(aliases=['e'])
async def entry(ctx, price: float):
    start_time = datetime.now()
    user = ctx.author
    logger.info(f"[{start_time}] [Command: entry] User: {user} / Price: {price}")

    try:
        # ファイルに価格を保存
        with open("entry_price.txt", "w") as f:
            f.write(str(price))
            logger.success(f"entry_price.txt に価格 {price} を書き込みました。")
        await ctx.send(f"✅ エントリー価格を {price} 円で登録しました。")
        
    except Exception as e:
        logger.error(f"価格登録エラー: {e}")
        await ctx.send("⚠️ 登録に失敗しました。ログを確認してください。")

# エントリー価格をクリア
@bot.command(aliases=['x', 'cl'])
async def exit(ctx):
    start_time = datetime.now()
    logger.info(f"[{start_time}] [Command: exit] User: {ctx.author}")

    try:
        file_path = "entry_price.txt"
        # ファイルの中身をクリアする
        with open(file_path, "w") as f:
            pass 
        logger.info("entry_price.txt をクリアしました。")
        await ctx.send("✅ 価格保持テキストファイルをクリアしました。")

    except Exception as e:
        logger.error(f"価格クリアエラー: {e}")
        await ctx.send("⚠️ クリアに失敗しました。ログを確認してください。")

bot.run(DISCORD_BOT_TOKEN)