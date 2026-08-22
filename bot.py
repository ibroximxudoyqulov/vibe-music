import os
import sys
import time
import sqlite3
import datetime
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, 
    ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
)

# ==================== 1. RENDER 24/7 HEALTH-CHECK ====================
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(b"<h1>VibeStudio Bot is 100% Active!</h1>")

    def log_message(self, format, *args):
        return

def run_health_server():
    port = int(os.environ.get("PORT", 10000))
    print(f"--> [OK] Health Server {port}-portda muvaffaqiyatli ishga tushdi!")
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

threading.Thread(target=run_health_server, daemon=True).start()

# ==================== 2. SOZLAMALAR ====================
BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o"
ADMIN_ID = 6526744258
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=clean_final_1"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=20)

# ==================== 3. SQLITE ANIQ FOYDALANUVCHILAR BAZASI ====================
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

def get_user(user_id):
    conn = sqlite3.connect("users.db", timeout=15)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, lang, joined_date FROM users WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def save_user(user_id, username, lang='uz'):
    try:
        conn = sqlite3.connect("users.db", timeout=15)
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO users (user_id, username, lang, joined_date) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET username=excluded.username
        """, (user_id, username or "user", lang, now))
        conn.commit()
        conn.close()
        print(f"--> [DB OK] User muvaffaqiyatli saqlandi: {user_id}")
    except Exception as e:
        print(f"--> [DB ERROR] {e}")

def set_lang(user_id, lang):
    conn = sqlite3.connect("users.db", timeout=15)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET lang=? WHERE user_id=?", (lang, user_id))
    conn.commit()
    conn.close()

def get_total_users():
    try:
        conn = sqlite3.connect("users.db", timeout=15)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(DISTINCT user_id) FROM users")
        row = cursor.fetchone()
        count = row[0] if row else 0
        conn.close()
        return count
    except Exception as e:
        print(f"--> [STATS ERROR] {e}")
        return 0

# ==================== 4. LUG'AT ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! <b>VibeStudio</b>ga xush kelibsiz. 🎧✨\n\n🎬 Barcha xizmatlar (Spotify video yasash, musiqani qirqish, 70+ shriftlar) <b>100% BEPUL va CHEKSIZ!</b>\n\n👇 Ilovani ochish uchun pastdagi tugmani bosing:",
        "btn_open_app": "🎨 VibeStudio Ilovasi",
        "btn_lang": "🌐 Tilni O'zgartirish",
        "btn_info": "ℹ️ Bot Haqida",
        "select_lang": "Tilni tanlang / Выберите язык:"
    },
    "ru": {
        "welcome": "Здравствуйте! Добро пожаловать в <b>VibeStudio</b>. 🎧✨\n\n🎬 Все функции (создание Spotify видео, нарезка аудио, 70+ шрифтов) <b>100% БЕСПЛАТНЫ и БЕЗ ОГРАНИЧЕНИЙ!</b>\n\n👇 Нажмите кнопку ниже для запуска:",
        "btn_open_app": "🎨 Приложение VibeStudio",
        "btn_lang": "🌐 Сменить Язык",
        "btn_info": "ℹ️ О Боте",
        "select_lang": "Tilni tanlang / Выберите язык:"
    }
}

def get_main_menu(lang):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS[lang]["btn_open_app"], web_app=WebAppInfo(url=WEBAPP_URL)))
    markup.row(KeyboardButton(TEXTS[lang]["btn_lang"]), KeyboardButton(TEXTS[lang]["btn_info"]))
    return markup

# ==================== 5. HANDLERS ====================
@bot.message_handler(commands=['start'])
def start_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    user = get_user(user_id)
    lang = user[2] if user else 'uz'
    bot.send_message(message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

@bot.callback_query_handler(func=lambda call: call.data.startswith('lang_'))
def lang_callback(call):
    lang = call.data.split('_')[1]
    set_lang(call.from_user.id, lang)
    bot.delete_message(call.message.chat.id, call.message.message_id)
    bot.send_message(call.message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

# STATISTIKA BUYRUG'I
@bot.message_handler(commands=['stats'])
def stats_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    total = get_total_users()
    bot.send_message(message.chat.id, f"📊 <b>VibeStudio Aniq Statistikasi:</b>\n\n👥 Jami foydalanuvchilar: <b>{total} ta unikal obunachi</b>\n⚡️ Server: <b>24/7 Faol (Live)</b>", parse_mode="HTML")

@bot.message_handler(content_types=['text'])
def message_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    user = get_user(user_id)
    lang = user[2] if user else 'uz'
    text = message.text

    if text in [TEXTS["uz"]["btn_lang"], TEXTS["ru"]["btn_lang"]]:
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru")
        )
        bot.send_message(message.chat.id, TEXTS[lang]["select_lang"], reply_markup=markup)
        return

    # "BOT HAQIDA" TUGMASI (ADMIN UCHUN STATISTIKA KO'RSATILADI)
    if text in [TEXTS["uz"]["btn_info"], TEXTS["ru"]["btn_info"]]:
        is_admin = (user_id == ADMIN_ID)
        total = get_total_users()
        if is_admin:
            info_msg = (
                f"🌟 <b>VibeStudio Admin Paneli</b>\n\n"
                f"👑 <b>Siz:</b> Bosh Admin\n"
                f"👥 <b>Haqiqiy Foydalanuvchilar:</b> <code>{total}</code> ta unikal obunachi\n"
                f"⚡️ <b>Server:</b> 24/7 Faol (Render Live)"
            )
        else:
            info_msg = (
                f"🌟 <b>VibeStudio & VibeMusic</b> — TikTok va Instagram uchun estetik Spotify videolarni va musiqalarni 1 daqiqada tayyorlab beruvchi bepul platforma!\n\n"
                f"👨‍💻 Dasturchi & Hamkorlik: @IBROXIM_I6\n"
                f"⚡️ <b>Holat:</b> 100% Bepul va Cheksiz"
                if lang == 'uz' else
                f"🌟 <b>VibeStudio & VibeMusic</b> — бесплатная платформа для создания эстетичных Spotify видео для TikTok и Instagram за 1 минуту!\n\n"
                f"👨‍💻 Разработчик: @IBROXIM_I6\n"
                f"⚡️ <b>Статус:</b> 100% Бесплатно"
            )
        bot.send_message(message.chat.id, info_msg, parse_mode="HTML")
        return

    bot.send_message(message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

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
