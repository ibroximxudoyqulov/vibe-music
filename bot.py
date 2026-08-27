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
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=channel_karaoke_v1"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=25)

# ==================== 1. RENDER 24/7 HEALTH SERVER ====================
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h1>VibeStudio is 100% Active!</h1>")

    def log_message(self, format, *args):
        return

def run_health_server():
    port = int(os.environ.get("PORT", 10000))
    print(f"--> [OK] Health Server {port}-portda ishga tushdi!")
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

# ==================== 3. LUG'AT VA MENYU (REKLAMASIZ) ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! <b>VibeStudio</b>ga xush kelibsiz. 🎧✨\n\n🎬 Spotify video yasash, musiqani qirqish va video yuklash <b>100% BEPUL!</b>\n\n👇 Ilovani ochish uchun pastdagi tugmani bosing:",
        "btn_open_app": "🎨 VibeStudio Ilovasi (Mini App)",
        "btn_downloader": "📥 Video Yuklash (Insta/TikTok)",
        "btn_info": "ℹ️ Bot Haqida",
        "dl_prompt": "📥 <b>Universal Media Yuklovchi:</b>\nTikTok yoki Instagram havolasini yuboring:",
        "dl_processing": "⏳ Video yuklanmoqda...",
        "dl_error": "⚠️ Havolani tekshirib qaytadan yuboring!"
    }
}

def get_main_menu():
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS["uz"]["btn_open_app"], web_app=WebAppInfo(url=WEBAPP_URL)))
    markup.row(KeyboardButton(TEXTS["uz"]["btn_downloader"]), KeyboardButton(TEXTS["uz"]["btn_info"]))
    return markup

# ==================== 4. TIKTOK & INSTAGRAM YUKLOVCHI (REDIRECT FIX) ====================
def download_social_media(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        # vt.tiktok.com qisqa havolani to'liq manzilga ochish (Unshortener)
        session = requests.Session()
        res_head = session.head(url, allow_redirects=True, timeout=8, headers=headers)
        real_url = res_head.url if res_head.url else url

        # TikWM orqali suv belgisisiz yuklash
        if "tiktok.com" in real_url or "tiktok.com" in url:
            res = requests.post("https://www.tikwm.com/api/", data={"url": real_url, "hd": 1}, headers=headers, timeout=12).json()
            if res.get("code") == 0 and res.get("data"):
                video_url = res["data"].get("play") or res["data"].get("hdplay")
                title = res["data"].get("title", "TikTok Video")
                return {"type": "video", "url": video_url, "title": title}

        # Cobalt API Universal (Instagram / Pinterest)
        cobalt_res = requests.post(
            "https://api.cobalt.tools/api/json",
            json={"url": real_url, "vQuality": "720"},
            headers={"Accept": "application/json", "Content-Type": "application/json", "User-Agent": headers["User-Agent"]},
            timeout=12
        ).json()
        if cobalt_res.get("url"):
            return {"type": "video", "url": cobalt_res["url"], "title": "Social Video"}

    except Exception as e:
        print(f"[DL Error] {e}")
    return None

# ==================== 5. HANDLERS ====================
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
    bot.send_message(message.chat.id, f"📊 <b>VibeStudio Aniq Statistikasi:</b>\n\n👥 Jami Obunachilar: <b>{total} ta</b>\n⚡️ Server: <b>24/7 Render Live</b>", parse_mode="HTML")

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

    # HAVOLA KELGANDA AVTOMATIK YUKLASH
    url_match = re.search(r'(https?://[^\s]+)', text)
    if url_match:
        clean_url = url_match.group(1).split('?')[0] if "tiktok.com" in url_match.group(1) else url_match.group(1)
        wait_msg = bot.send_message(message.chat.id, TEXTS["uz"]["dl_processing"])
        
        media = download_social_media(clean_url)
        if media and media.get("url"):
            try:
                vid_data = requests.get(media["url"], timeout=25).content
                bot.send_video(
                    message.chat.id, 
                    vid_data, 
                    caption=f"🎬 <b>{media.get('title', 'Video')[:50]}</b>\n\n📥 @ms_mus1c_bot orqali yuklandi!", 
                    parse_mode="HTML"
                )
                bot.delete_message(message.chat.id, wait_msg.message_id)
                return
            except Exception:
                bot.send_video(message.chat.id, media["url"], caption="🎬 @ms_mus1c_bot")
                bot.delete_message(message.chat.id, wait_msg.message_id)
                return
        
        bot.send_message(message.chat.id, TEXTS["uz"]["dl_error"])
        return

    bot.send_message(message.chat.id, TEXTS["uz"]["welcome"], parse_mode="HTML", reply_markup=get_main_menu())

# ==================== 6. AUTO-RECONNECT ====================
if __name__ == '__main__':
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass
    time.sleep(2)
    print("VibeStudio Bot 24/7 ishga tushdi...")
    while True:
        try:
            bot.infinity_polling(skip_pending=True, timeout=20)
        except Exception as e:
            print(f"Qayta ulanmoqda: {e}")
            time.sleep(3)
