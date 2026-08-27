import os
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

BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o"
ADMIN_ID = 6526744258
SECRET_CHANNEL_ID = "-1004428420836"
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=server_bridge_v1"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=25)

# ==================== 1. RENDER SERVER KO'PRIGI (CORS & UPLOAD HANDLER) ====================
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
        self.wfile.write(b"<h1>VibeStudio Render Bridge is 100% Active!</h1>")

    def do_POST(self):
        # Mini App'dan yuborilgan video/audioni qabul qilish va Kanalga tashlash
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            if "upload_video" in self.path:
                bot.send_video(
                    SECRET_CHANNEL_ID, 
                    post_data, 
                    caption="🎬 <b>VibeStudio 60FPS Video!</b>\n\n📥 @ms_mus1c_bot orqali tayyorlandi!",
                    parse_mode="HTML"
                )
            elif "upload_audio" in self.path:
                bot.send_audio(
                    SECRET_CHANNEL_ID, 
                    post_data, 
                    caption="✂️ <b>VibeStudio Qirqilgan MP3!</b>\n\n📥 @ms_mus1c_bot",
                    parse_mode="HTML"
                )

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
    print(f"--> [OK] Render Bridge Server {port}-portda ishga tushdi!")
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
        "welcome": "Assalomu alaykum! <b>VibeStudio</b>ga xush kelibsiz. 🎧✨\n\n🎬 Spotify video yasash, musiqani qirqish va video yuklash <b>100% BEPUL!</b>\n\n👇 Ilovani ochish uchun pastdagi tugmani bosing:",
        "btn_open_app": "🎨 VibeStudio Ilovasi (Mini App)",
        "btn_downloader": "📥 Video Yuklash (Insta/TikTok)",
        "btn_lang": "🌐 Tilni O'zgartirish",
        "btn_info": "ℹ️ Bot Haqida",
        "dl_prompt": "📥 <b>Universal Media Yuklovchi:</b>\nTikTok, Instagram (Reels), Pinterest havolasini yuboring:",
        "dl_processing": "⏳ Video yuklanmoqda...",
        "dl_error": "⚠️ Havolani tekshirib qaytadan yuboring!"
    }
}

def get_main_menu(lang="uz"):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS["uz"]["btn_open_app"], web_app=WebAppInfo(url=WEBAPP_URL)))
    markup.row(KeyboardButton(TEXTS["uz"]["btn_downloader"]), KeyboardButton(TEXTS["uz"]["btn_info"]))
    return markup

# ==================== 4. HANDLERS ====================
@bot.message_handler(commands=['start'])
def start_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    bot.send_message(message.chat.id, TEXTS["uz"]["welcome"], parse_mode="HTML", reply_markup=get_main_menu("uz"))

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
            bot.send_message(message.chat.id, f"👑 <b>Admin Paneli</b>\n👥 Jami foydalanuvchilar: <code>{total}</code> ta\n⚡️ Server: 24/7 Faol", parse_mode="HTML")
        else:
            bot.send_message(message.chat.id, "🌟 <b>VibeStudio & VibeMusic</b> — TikTok va Instagram uchun estetik videolarni 1 daqiqada tayyorlovchi bepul platforma!\n\n👨‍💻 Dasturchi: @IBROXIM_I6", parse_mode="HTML")
        return

    if text in [TEXTS["uz"]["btn_downloader"]]:
        bot.send_message(message.chat.id, TEXTS["uz"]["dl_prompt"], parse_mode="HTML")
        return

    # HAVOLADAN YUKLASH
    url_match = re.search(r'(https?://[^\s]+)', text)
    if url_match:
        clean_url = url_match.group(1).split('?')[0] if "tiktok.com" in url_match.group(1) else url_match.group(1)
        wait_msg = bot.send_message(message.chat.id, TEXTS["uz"]["dl_processing"])
        
        try:
            if "tiktok.com" in clean_url:
                res = requests.post("https://www.tikwm.com/api/", data={"url": clean_url, "hd": 1}, timeout=12).json()
                if res.get("code") == 0 and res.get("data"):
                    v_url = res["data"].get("play") or res["data"].get("hdplay")
                    vid_data = requests.get(v_url, timeout=25).content
                    bot.send_video(message.chat.id, vid_data, caption="🎬 @ms_mus1c_bot orqali yuklandi!")
                    bot.delete_message(message.chat.id, wait_msg.message_id)
                    return
        except Exception:
            pass
        bot.send_message(message.chat.id, TEXTS["uz"]["dl_error"])
        return

    bot.send_message(message.chat.id, TEXTS["uz"]["welcome"], parse_mode="HTML", reply_markup=get_main_menu("uz"))

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
