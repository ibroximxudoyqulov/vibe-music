import os
import io
import re
import sys
import time
import sqlite3
import datetime
import threading
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, 
    ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
)

# SIZNING BOTINGIZ VA KANALINGIZ:
BOT_TOKEN = "8824021433:AAHsBf1axRyavod-ZZ18uOEmBWxsWYASGV8"
ADMIN_ID = 6526744258
TARGET_CHANNEL = "@ms_music_karaoke" # https://t.me/ms_music_karaoke
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=channel_master_v15"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=25)

# ==================== 1. RENDER SERVER KO'PRIGI (BYTESIO FAYL YUKLOVCHI) ====================
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h1>VibeStudio Channel Bridge is 100% Active!</h1>")

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            if "upload_video" in self.path:
                # XOM BAYTLARNI VIRTUAL MP4 FAYLGA O'RASH (BYTESIO)
                video_file = io.BytesIO(post_data)
                video_file.name = f"VibeStudio_{int(time.time())}.mp4"

                # 1. KANALGA YUBORISH
                bot.send_video(
                    TARGET_CHANNEL, 
                    video_file, 
                    caption="🎬 <b>Yangi VibeStudio 60FPS Video!</b>\n\n📥 @ms_music_karaoke kanaliga yuklandi!\n📲 Bot: @ms_mus1c_bot", 
                    parse_mode="HTML"
                )
                print("--> [SUCCESS] Video @ms_music_karaoke kanaliga muvaffaqiyatli joylandi!")

            elif "upload_audio" in self.path:
                # XOM BAYTLARNI VIRTUAL MP3 FAYLGA O'RASH
                audio_file = io.BytesIO(post_data)
                audio_file.name = f"VibeStudio_Cut_{int(time.time())}.mp3"

                bot.send_audio(
                    TARGET_CHANNEL, 
                    audio_file, 
                    caption="✂️ <b>VibeStudio Qirqilgan MP3 Musiqa!</b>\n\n📥 @ms_music_karaoke", 
                    parse_mode="HTML"
                )
                print("--> [SUCCESS] Audio @ms_music_karaoke kanaliga muvaffaqiyatli joylandi!")

            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"success"}')

        except Exception as e:
            print(f"[Upload Error] {e}")
            self.send_response(500)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

    def log_message(self, format, *args):
        return

def run_health_server():
    port = int(os.environ.get("PORT", 10000))
    print(f"--> [OK] Render Channel Bridge Server {port}-portda ishga tushdi!")
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

threading.Thread(target=run_health_server, daemon=True).start()

# ==================== 2. SQLITE BAZA ====================
def init_db():
    conn = sqlite3.connect("users.db", timeout=15, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            lang TEXT DEFAULT 'uz',
            joined_date TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    return sqlite3.connect("users.db", timeout=15)

def save_user(user_id, username, lang="uz"):
    try:
        conn = get_db()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO users (user_id, username, lang, joined_date) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET username=excluded.username
        """, (user_id, username or "user", lang, now))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Error] {e}")

def get_total_users():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(DISTINCT user_id) FROM users")
        count = cursor.fetchone()[0]
        conn.close()
        return count
    except Exception:
        return 0

# ==================== 3. LUG'AT VA MENYU ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! <b>VibeStudio</b>ga xush kelibsiz. 🎧✨\n\n🎬 Spotify video yasash, musiqani qirqish va kanaldagi musiqalar <b>100% BEPUL!</b>\n\n👇 Ilovani ochish uchun pastdagi tugmani bosing:",
        "btn_open_app": "🎨 VibeStudio Ilovasi (Mini App)",
        "btn_info": "ℹ️ Bot Haqida"
    }
}

def get_main_menu():
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS["uz"]["btn_open_app"], web_app=WebAppInfo(url=WEBAPP_URL)))
    markup.row(KeyboardButton(TEXTS["uz"]["btn_info"]))
    return markup

# ==================== 4. HANDLERS ====================
@bot.message_handler(commands=['start'])
def start_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    bot.send_message(message.chat.id, TEXTS["uz"]["welcome"], parse_mode="HTML", reply_markup=get_main_menu())

@bot.message_handler(commands=['stats'])
def stats_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    total = get_total_users()
    bot.send_message(message.chat.id, f"📊 <b>VibeStudio Statistikasi:</b>\n\n👥 Jami Obunachilar: <b>{total} ta</b>\n⚡️ Server: <b>24/7 Render Live</b>", parse_mode="HTML")

@bot.message_handler(content_types=['text'])
def message_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    text = message.text.strip()

    if text in [TEXTS["uz"]["btn_info"]]:
        is_admin = (user_id == ADMIN_ID)
        total = get_total_users()
        if is_admin:
            bot.send_message(message.chat.id, f"👑 <b>Admin Paneli</b>\n\n👥 Jami foydalanuvchilar: <code>{total}</code> ta\n⚡️ Server: 24/7 Faol", parse_mode="HTML")
        else:
            bot.send_message(message.chat.id, "🌟 <b>VibeStudio & VibeMusic</b> — TikTok va Instagram uchun estetik videolarni 1 daqiqada tayyorlovchi bepul platforma!\n\n📢 Rasmiy Kanal: @ms_music_karaoke\n👨‍💻 Dasturchi: @IBROXIM_I6", parse_mode="HTML")
        return

    bot.send_message(message.chat.id, TEXTS["uz"]["welcome"], parse_mode="HTML", reply_markup=get_main_menu())

# ==================== 5. AUTO-RECONNECT ====================
if __name__ == '__main__':
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass
    time.sleep(2)
    print("VibeStudio Master Bot 24/7 ishga tushdi...")
    while True:
        try:
            bot.infinity_polling(skip_pending=True, timeout=20)
        except Exception as e:
            print(f"Qayta ulanmoqda: {e}")
            time.sleep(3)
