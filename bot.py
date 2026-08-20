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

# ==================== 1. RENDER 24/7 HEALTH-CHECK SERVER ====================
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(b"<h1>VibeStudio is 100% Active & 24/7 Free Running!</h1>")

    def log_message(self, format, *args):
        return

def run_health_server():
    port = int(os.environ.get("PORT", 10000))
    print(f"--> [OK] Health Server {port}-portda muvaffaqiyatli ishga tushdi!")
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

threading.Thread(target=run_health_server, daemon=True).start()

# ==================== 2. SOZLAMALAR VA KALITLAR ====================
BOT_TOKEN = "8996809088:AAHpjXuUsA2LkLW0szvg4AZb8Fa0scv1p2M"
ADMIN_ID = 6526744258  # Sizning shaxsiy Admin ID raqamingiz
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=free_clean_v10"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=20)
user_states = {}

# ==================== 3. SQLITE DATABASE (WAL TEZKOR REJIM) ====================
def init_db():
    conn = sqlite3.connect("users.db", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")  # Katta auditoriya uchun tezkor rejim
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            lang TEXT DEFAULT 'uz',
            joined_date TEXT,
            video_count INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_user(user_id):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, lang, joined_date, video_count FROM users WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def save_user(user_id, username, lang='uz'):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    cursor.execute("""
        INSERT INTO users (user_id, username, lang, joined_date) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET username=excluded.username
    """, (user_id, username, lang, now))
    conn.commit()
    conn.close()

def set_lang(user_id, lang):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET lang=? WHERE user_id=?", (lang, user_id))
    conn.commit()
    conn.close()

def get_total_users():
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()
    return count

# ==================== 4. LUG'AT (O'ZBEKCHA / RUSSKIY) ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! <b>VibeStudio</b>ga xush kelibsiz. 🎧✨\n\n🎬 Barcha xizmatlar (Spotify video yasash, musiqani qirqish, 70+ shriftlar) <b>100% BEPUL va CHEKSIZ!</b>\n\nQuyidagi menyudan kerakli bo'limni tanlang:",
        "btn_studio": "🎤 Spotify Video Yasash",
        "btn_trimmer": "✂️ Musiqa Qirqish Studiyasi",
        "btn_lang": "🌐 Tilni O'zgartirish",
        "btn_info": "ℹ️ Bot Haqida",
        "open_app_btn": "🎨 VibeStudio Ilovasini Ochish",
        "info_text": "🌟 <b>VibeStudio & VibeMusic</b> — bu TikTok va Instagram uchun estetik Spotify videolarni va musiqalarni 1 daqiqada tayyorlab beruvchi bepul platforma!\n\n👨‍💻 Dasturchi & Admin: @IBROXIM_I6",
        "select_lang": "Tilni tanlang / Выберите язык:",
        "unknown": "⚠️ Noma'lum buyruq! Iltimos, pastdagi menyu tugmalaridan foydalaning."
    },
    "ru": {
        "welcome": "Здравствуйте! Добро пожаловать в <b>VibeStudio</b>. 🎧✨\n\n🎬 Все функции (создание Spotify видео, нарезка аудио, 70+ шрифтов) <b>100% БЕСПЛАТНЫ и БЕЗ ОГРАНИЧЕНИЙ!</b>\n\nВыберите нужный раздел из меню ниже:",
        "btn_studio": "🎤 Создать Spotify Видео",
        "btn_trimmer": "✂️ Студия Нарезки Аудио",
        "btn_lang": "🌐 Сменить Язык",
        "btn_info": "ℹ️ О Боте",
        "open_app_btn": "🎨 Открыть VibeStudio",
        "info_text": "🌟 <b>VibeStudio & VibeMusic</b> — бесплатная платформа для создания эстетичных Spotify видео для TikTok и Instagram за 1 минуту!\n\n👨‍💻 Разработчик: @IBROXIM_I6",
        "select_lang": "Tilni tanlang / Выберите язык:",
        "unknown": "⚠️ Неизвестная команда! Пожалуйста, используйте кнопки меню."
    }
}

# ==================== 5. ASOSIY MENYU TUGMALARI ====================
def get_main_menu(lang):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS[lang]["btn_studio"]))
    markup.row(KeyboardButton(TEXTS[lang]["btn_trimmer"]))
    markup.row(KeyboardButton(TEXTS[lang]["btn_lang"]), KeyboardButton(TEXTS[lang]["btn_info"]))
    return markup

# ==================== 6. HANDLERS (BUYRUQLAR) ====================

@bot.message_handler(commands=['start'])
def start_handler(message):
    user_id = message.from_user.id
    user = get_user(user_id)
    
    if not user:
        save_user(user_id, message.from_user.username or "user", "uz")
        # 1-marta kirganida til tanlash
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru")
        )
        bot.send_message(message.chat.id, "Tilni tanlang / Выберите язык:", reply_markup=markup)
    else:
        lang = user[2] or 'uz'
        # Asosiy xabar va Mini App tugmasi
        inline_btn = InlineKeyboardMarkup()
        inline_btn.add(InlineKeyboardButton(text=TEXTS[lang]["open_app_btn"], web_app=WebAppInfo(url=WEBAPP_URL)))
        bot.send_message(message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))
        bot.send_message(message.chat.id, "👇 Ilovani to'liq ekranda ochish uchun bosing:", reply_markup=inline_btn)

# TILNI O'ZGARTIRISH (INLINE CALLBACK)
@bot.callback_query_handler(func=lambda call: call.data.startswith('lang_'))
def lang_callback(call):
    lang = call.data.split('_')[1]
    set_lang(call.from_user.id, lang)
    bot.delete_message(call.message.chat.id, call.message.message_id)
    
    inline_btn = InlineKeyboardMarkup()
    inline_btn.add(InlineKeyboardButton(text=TEXTS[lang]["open_app_btn"], web_app=WebAppInfo(url=WEBAPP_URL)))
    bot.send_message(call.message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))
    bot.send_message(call.message.chat.id, "👇 Ilovani to'liq ekranda ochish uchun bosing:", reply_markup=inline_btn)

# ADMIN STATISTIKA BUYRUG'I (/stats)
@bot.message_handler(commands=['stats'])
def stats_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    total = get_total_users()
    bot.send_message(message.chat.id, f"📊 <b>VibeStudio Statistikasi:</b>\n\n👥 Jami foydalanuvchilar: <b>{total} ta</b>\n⚡️ Server holati: <b>24/7 Faol (Live)</b>", parse_mode="HTML")

# ADMIN BROADCAST BUYRUG'I (/broadcast)
@bot.message_handler(commands=['broadcast'])
def broadcast_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    msg_text = message.text.replace('/broadcast', '').strip()
    if not msg_text:
        bot.send_message(message.chat.id, "⚠️ Xabar yuborish uchun: <code>/broadcast Xabar matni</code> deb yozing.")
        return

    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users")
    users = cursor.fetchall()
    conn.close()

    sent = 0
    for u in users:
        try:
            bot.send_message(u[0], msg_text, parse_mode="HTML")
            sent += 1
            time.sleep(0.05)
        except Exception:
            pass
    bot.send_message(message.chat.id, f"✅ Xabar <b>{sent} ta</b> foydalanuvchiga yuborildi!", parse_mode="HTML")

# TEKSTLI BUYRUQLAR BOSHGRUVI
@bot.message_handler(content_types=['text'])
def message_handler(message):
    user_id = message.from_user.id
    user = get_user(user_id)
    lang = user[2] if user else 'uz'
    text = message.text

    # TILNI O'ZGARTIRISH
    if text in [TEXTS["uz"]["btn_lang"], TEXTS["ru"]["btn_lang"]]:
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru")
        )
        bot.send_message(message.chat.id, TEXTS[lang]["select_lang"], reply_markup=markup)
        return

    # BOT HAQIDA
    if text in [TEXTS["uz"]["btn_info"], TEXTS["ru"]["btn_info"]]:
        bot.send_message(message.chat.id, TEXTS[lang]["info_text"], parse_mode="HTML")
        return

    # STUDIYA YOKI KESISH TUGMASI (MINI APP OCHISH)
    if text in [TEXTS["uz"]["btn_studio"], TEXTS["ru"]["btn_studio"], TEXTS["uz"]["btn_trimmer"], TEXTS["ru"]["btn_trimmer"]]:
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(text=TEXTS[lang]["open_app_btn"], web_app=WebAppInfo(url=WEBAPP_URL)))
        bot.send_message(message.chat.id, f"🎬 <b>VibeStudio'ni ishga tushirish:</b>\nQuyidagi tugmani bosing va cheksiz foydalaning:", parse_mode="HTML", reply_markup=markup)
        return

    # NOMA'LUM BUYRUQ
    bot.send_message(message.chat.id, TEXTS[lang]["unknown"])

# ==================== 7. AUTO-RECONNECT 24/7 POLLING ====================
if __name__ == '__main__':
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass
    time.sleep(2)
    print("VibeStudio Free Bot 24/7 uzluksiz ishga tushdi...")
    while True:
        try:
            bot.infinity_polling(skip_pending=True, timeout=20)
        except Exception as e:
            print(f"Qayta ulanmoqda: {e}")
            time.sleep(3)
