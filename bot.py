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
    ReplyKeyboardMarkup, KeyboardButton, WebAppInfo,
    LabeledPrice, PreCheckoutQuery
)

# ==================== 1. RENDER 24/7 HEALTH-CHECK SERVER ====================
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(b"<h1>VibeStudio Master Engine is 100% Active!</h1>")

    def log_message(self, format, *args):
        return

def run_health_server():
    port = int(os.environ.get("PORT", 10000))
    print(f"--> [OK] Health Server {port}-portda muvaffaqiyatli ishga tushdi!")
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

threading.Thread(target=run_health_server, daemon=True).start()

# ==================== 2. SOZLAMALAR VA KALITLAR ====================
BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o"
ADMIN_ID = 6526744258  # Sizning shaxsiy Admin ID raqamingiz
SECRET_CHANNEL_ID = -1004428420836  # Buyurtmalar va Arxiv kanali
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=master_v1"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=25)
user_states = {}

# ==================== 3. SQLITE WAL BAZA (DOIMIY & MASSIV SCALE) ====================
def init_db():
    conn = sqlite3.connect("users.db", timeout=15, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    
    # Foydalanuvchilar jadvali
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            lang TEXT DEFAULT 'uz',
            tier TEXT DEFAULT 'free',
            tier_expires TEXT,
            downloads_count INTEGER DEFAULT 0,
            videos_count INTEGER DEFAULT 0,
            joined_date TEXT
        )
    """)
    
    # Bot sozlamalari jadvali (Sponsor kanallar, narxlar)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # Standart narxlar (Telegram Stars ⭐)
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_uz_pro', '25')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_uz_vip', '75')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ru_pro', '50')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ru_vip', '150')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_en_pro', '125')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_en_vip', '350')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('sponsor_channel', '')")
    
    conn.commit()
    conn.close()

init_db()

def get_db():
    return sqlite3.connect("users.db", timeout=15)

def get_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, lang, tier, tier_expires, downloads_count, videos_count, joined_date FROM users WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def save_user(user_id, username, lang='uz'):
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

def set_user_lang(user_id, lang):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET lang=? WHERE user_id=?", (lang, user_id))
    conn.commit()
    conn.close()

def set_user_tier(user_id, tier, days=30):
    conn = get_db()
    cursor = conn.cursor()
    expires = (datetime.datetime.now() + datetime.timedelta(days=days)).strftime("%Y-%m-%d %H:%M")
    cursor.execute("UPDATE users SET tier=?, tier_expires=? WHERE user_id=?", (tier, expires, user_id))
    conn.commit()
    conn.close()

def get_setting(key, default=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key=?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_setting(key, value):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()

# ==================== 4. LUG'AT (3 TA TILDA: UZ / RU / EN) ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! <b>VibeStudio</b> ekotizimiga xush kelibsiz. 🎧✨\n\n🎬 Spotify videolar yasash, audioni qirqish va ijtimoiy tarmoqlardan video yuklash platformasi!\n\n👇 Quyidagi menyudan kerakli bo'limni tanlang:",
        "btn_open_app": "🎨 VibeStudio Ilovasi (Mini App)",
        "btn_downloader": "📥 Video Yuklash (Insta/TikTok/Pin)",
        "btn_packages": "⭐ VIP & PRO Tariflar",
        "btn_lang": "🌐 Tilni O'zgartirish",
        "btn_info": "ℹ️ Bot Haqida",
        "dl_prompt": "📥 <b>Universal Media Yuklovchi:</b>\n\nTikTok, Instagram (Reels), Pinterest yoki Snapchat havolasini yuboring:",
        "dl_processing": "⏳ Video tahlil qilinmoqda va yuklab olinmoqda...",
        "dl_error": "⚠️ Havoladan video yuklab bo'lmadi. Havola ochiq va to'g'riligini tekshiring!",
        "sponsor_alert": "📢 <b>Xizmatdan foydalanish uchun homiy kanalimizga obuna bo'ling:</b>",
        "sponsor_check_btn": "✅ Obunani Tasdiqlash",
        "select_lang": "Tilni tanlang / Choose language / Выберите язык:"
    },
    "ru": {
        "welcome": "Здравствуйте! Добро пожаловать в <b>VibeStudio</b>. 🎧✨\n\n🎬 Платформа для создания Spotify видео, нарезки аудио и скачивания медиа без водяных знаков!\n\n👇 Выберите нужный раздел:",
        "btn_open_app": "🎨 Приложение VibeStudio",
        "btn_downloader": "📥 Скачать Видео (Insta/TikTok/Pin)",
        "btn_packages": "⭐ VIP & PRO Тарифы",
        "btn_lang": "🌐 Сменить Язык",
        "btn_info": "ℹ️ О Боте",
        "dl_prompt": "📥 <b>Универсальный Загрузчик:</b>\n\nОтправьте ссылку на TikTok, Instagram (Reels), Pinterest или Snapchat:",
        "dl_processing": "⏳ Загрузка и обработка видео...",
        "dl_error": "⚠️ Не удалось скачать видео. Проверьте правильность ссылки!",
        "sponsor_alert": "📢 <b>Для использования подпишитесь на спонсорский канал:</b>",
        "sponsor_check_btn": "✅ Проверить подписку",
        "select_lang": "Tilni tanlang / Choose language / Выберите язык:"
    },
    "en": {
        "welcome": "Welcome to <b>VibeStudio</b>! 🎧✨\n\n🎬 The #1 Studio for creating aesthetic Spotify videos, trimming audio, and downloading HD media with no watermarks!\n\n👇 Select an option below:",
        "btn_open_app": "🎨 Open VibeStudio App",
        "btn_downloader": "📥 Download Media (Insta/TikTok/Pin)",
        "btn_packages": "⭐ VIP & PRO Subscriptions",
        "btn_lang": "🌐 Change Language",
        "btn_info": "ℹ️ About Platform",
        "dl_prompt": "📥 <b>Universal Media Downloader:</b>\n\nSend any TikTok, Instagram (Reels), Pinterest, or Snapchat link:",
        "dl_processing": "⏳ Processing and downloading video...",
        "dl_error": "⚠️ Could not download media. Please ensure the link is public and valid!",
        "sponsor_alert": "📢 <b>Please join our sponsor channel to continue:</b>",
        "sponsor_check_btn": "✅ Verify Subscription",
        "select_lang": "Tilni tanlang / Choose language / Выберите язык:"
    }
}

def get_main_menu(lang):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS[lang]["btn_open_app"], web_app=WebAppInfo(url=WEBAPP_URL)))
    markup.row(KeyboardButton(TEXTS[lang]["btn_downloader"]), KeyboardButton(TEXTS[lang]["btn_packages"]))
    markup.row(KeyboardButton(TEXTS[lang]["btn_lang"]), KeyboardButton(TEXTS[lang]["btn_info"]))
    return markup

# ==================== 5. UNIVERSAL DOWNLOADER (TIKTOK / INSTA / PIN) ====================
def download_social_media(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        # 1. TIKTOK (TikWM POST usuli - Qisqa vt.tiktok.com havolalarni 100% ochadi)
        if "tiktok.com" in url:
            res = requests.post("https://www.tikwm.com/api/", data={"url": url, "hd": 1}, headers=headers, timeout=12).json()
            if res.get("code") == 0 and res.get("data"):
                video_url = res["data"].get("play") or res["data"].get("hdplay") or res["data"].get("wmplay")
                title = res["data"].get("title", "TikTok Video")
                return {"type": "video", "url": video_url, "title": title}
        
        # 2. INSTAGRAM / PINTEREST / SNAPCHAT (Cobalt API)
        cobalt_res = requests.post(
            "https://api.cobalt.tools/api/json",
            json={"url": url, "vQuality": "720"},
            headers={"Accept": "application/json", "Content-Type": "application/json", "User-Agent": headers['User-Agent']},
            timeout=12
        ).json()
        if cobalt_res.get("url"):
            return {"type": "video", "url": cobalt_res["url"], "title": "Social Video"}

    except Exception as e:
        print(f"[Downloader Error] {e}")
    return None

# ==================== 6. MAJBURIY SPONSOR OBUNASINI TEKSHIRISH ====================
def check_sponsor_subscription(user_id):
    sponsor = get_setting('sponsor_channel', '')
    if not sponsor:
        return True  # Sponsor yo'q bo'lsa to'g'ridan-to'g'ri o'tkazadi
    try:
        member = bot.get_chat_member(sponsor, user_id)
        if member.status in ['member', 'administrator', 'creator']:
            return True
    except Exception:
        return True
    return False

# ==================== 7. HANDLERS ====================

@bot.message_handler(commands=['start'])
def start_handler(message):
    user_id = message.from_user.id
    user = get_user(user_id)
    
    if not user:
        save_user(user_id, message.from_user.username or "user", "uz")
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en")
        )
        bot.send_message(message.chat.id, "Tilni tanlang / Choose language / Выберите язык:", reply_markup=markup)
    else:
        lang = user[2] or 'uz'
        bot.send_message(message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

@bot.callback_query_handler(func=lambda call: call.data.startswith('lang_'))
def lang_callback(call):
    lang = call.data.split('_')[1]
    set_user_lang(call.from_user.id, lang)
    bot.delete_message(call.message.chat.id, call.message.message_id)
    bot.send_message(call.message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

# ==================== 8. TELEGRAM STARS (⭐) TO'LOV VA PAKETLAR ====================

@bot.message_handler(func=lambda m: m.text in [TEXTS["uz"]["btn_packages"], TEXTS["ru"]["btn_packages"], TEXTS["en"]["btn_packages"]])
def packages_menu_handler(message):
    user_id = message.from_user.id
    user = get_user(user_id)
    lang = user[2] if user else 'uz'
    
    p_pro = get_setting(f'price_{lang}_pro', '25')
    p_vip = get_setting(f'price_{lang}_vip', '75')

    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(f"🌟 Creator PRO — {p_pro} ⭐ Stars", callback_data=f"buy_pro_{p_pro}"))
    markup.add(InlineKeyboardButton(f"👑 Elite VIP — {p_vip} ⭐ Stars", callback_data=f"buy_vip_{p_vip}"))

    desc = {
        "uz": f"👑 <b>VibeStudio Premium Obunalar:</b>\n\n🌟 <b>Creator PRO ({p_pro} ⭐):</b>\n• Barcha videolarda suv belgisi olib tashlanadi\n• 70+ shaxsiy shriftlar va cheksiz yuklash\n\n👑 <b>Elite VIP ({p_vip} ⭐):</b>\n• Cheksiz 60FPS Full HD eksport\n• Xonanda ovozi va musiqani ajratish\n• TikTok @ms.music_uz da reklama chegirmasi!",
        "ru": f"👑 <b>Премиум Подписки VibeStudio:</b>\n\n🌟 <b>Creator PRO ({p_pro} ⭐):</b>\n• Экспорт без водяных знаков\n• 70+ эксклюзивных шрифтов и безлимит\n\n👑 <b>Elite VIP ({p_vip} ⭐):</b>\n• Безлимитный 60FPS Full HD экспорт\n• Разделение вокала и минуса\n• Скидка на промо в TikTok @ms.music_uz!",
        "en": f"👑 <b>VibeStudio Premium Subscriptions:</b>\n\n🌟 <b>Creator PRO ({p_pro} ⭐):</b>\n• Remove watermark completely\n• 70+ custom fonts & unlimited downloads\n\n👑 <b>Elite VIP ({p_vip} ⭐):</b>\n• Unlimited 60FPS Full HD exports\n• AI Vocal & Music stem isolation\n• TikTok @ms.music_uz promotion discount!"
    }

    bot.send_message(message.chat.id, desc[lang], parse_mode="HTML", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith('buy_'))
def buy_subscription_callback(call):
    data = call.data.split('_')
    tier = data[1]
    stars = int(data[2])

    prices = [LabeledPrice(label=f"VibeStudio {tier.upper()} (30 kun)", amount=stars)]
    bot.send_invoice(
        chat_id=call.message.chat.id,
        title=f"VibeStudio {tier.upper()} Obuna",
        description=f"30 kunlik {tier.upper()} obunani Telegram Stars bilan faollashtirish",
        invoice_payload=f"sub_{tier}_{call.from_user.id}",
        provider_token="",  # Telegram Stars uchun bo'sh bo'lishi shart!
        currency="XTR",
        prices=prices
    )

@bot.pre_checkout_query_handler(func=lambda query: True)
def pre_checkout_handler(pre_checkout_query):
    bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@bot.message_handler(content_types=['successful_payment'])
def successful_payment_handler(message):
    payload = message.successful_payment.invoice_payload
    tier = payload.split('_')[1]
    user_id = message.from_user.id
    
    set_user_tier(user_id, tier, 30)
    bot.send_message(user_id, f"🎉 <b>Tabriklaymiz!</b> Sizning <b>{tier.upper()}</b> obunangiz 30 kunga faollashtirildi!")
    
    # Maxfiy arxivingizga xabar yetkazish
    caption = f"⭐ <b>YANGI TO'LOV!</b>\n👤 User: @{message.from_user.username} (<code>{user_id}</code>)\n📦 Paket: {tier.upper()}\n💰 Summa: {message.successful_payment.total_amount} Stars"
    bot.send_message(SECRET_CHANNEL_ID, caption, parse_mode="HTML")

# ==================== 9. ADMIN KONSOLI VA STATISTIKA ====================

@bot.message_handler(commands=['stats'])
def admin_stats_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM users WHERE lang='uz'")
    uz_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM users WHERE lang='ru'")
    ru_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM users WHERE lang='en'")
    en_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM users WHERE tier!='free'")
    vip_count = cursor.fetchone()[0]
    conn.close()

    stat_text = (
        f"📊 <b>VIBESTUDIO HAQIQIY STATISTIKASI:</b>\n\n"
        f"👥 <b>Jami Obunachilar:</b> <code>{total}</code> ta\n"
        f"🇺🇿 <b>O'zbek:</b> <code>{uz_count}</code> ta\n"
        f"🇷🇺 <b>Rus:</b> <code>{ru_count}</code> ta\n"
        f"🇬🇧 <b>Ingliz:</b> <code>{en_count}</code> ta\n\n"
        f"👑 <b>VIP/PRO Obunachilar:</b> <code>{vip_count}</code> ta\n"
        f"⚡️ <b>Server:</b> 24/7 Render Live"
    )
    bot.send_message(message.chat.id, stat_text, parse_mode="HTML")

# SPONSOR BELGILASH: /sponsor @kanal_nomi
@bot.message_handler(commands=['sponsor'])
def set_sponsor_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    channel = message.text.replace('/sponsor', '').strip()
    if channel:
        set_setting('sponsor_channel', channel)
        bot.send_message(message.chat.id, f"✅ Majburiy sponsor kanali o'rnatildi: <b>{channel}</b>", parse_mode="HTML")
    else:
        bot.send_message(message.chat.id, "⚠️ Format: <code>/sponsor @kanal_nomi</code>")

# SPONSORNI BEKOR QILISH: /unsponsor
@bot.message_handler(commands=['unsponsor'])
def remove_sponsor_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    set_setting('sponsor_channel', '')
    bot.send_message(message.chat.id, "✅ Majburiy homiylik obunasi butunlay o'chirildi!")

# NARXLARNI O'ZGARTIRISH: /price UZ pro 30
@bot.message_handler(commands=['price'])
def set_price_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    try:
        parts = message.text.split()
        region = parts[1].lower()  # uz, ru, en
        tier = parts[2].lower()    # pro, vip
        amount = int(parts[3])
        set_setting(f"price_{region}_{tier}", amount)
        bot.send_message(message.chat.id, f"✅ Narx yangilandi: <b>{region.upper()} {tier.upper()} = {amount} ⭐</b>", parse_mode="HTML")
    except Exception:
        bot.send_message(message.chat.id, "⚠️ Format: <code>/price uz pro 30</code> yoki <code>/price en vip 400</code>")

# SARALANGAN XABAR YUBORISH (BROADCAST)
@bot.message_handler(commands=['broadcast'])
def broadcast_handler(message):
    if message.from_user.id != ADMIN_ID:
        return
    msg_text = message.text.replace('/broadcast', '').strip()
    if not msg_text:
        bot.send_message(message.chat.id, "⚠️ Format: <code>/broadcast Xabar matni</code>")
        return

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users")
    users = cursor.fetchall()
    conn.close()

    sent = 0
    for u in users:
        try:
            bot.send_message(u[0], msg_text, parse_mode="HTML")
            sent += 1
            time.sleep(0.04)
        except Exception:
            pass
    bot.send_message(message.chat.id, f"✅ Xabar <b>{sent} ta</b> foydalanuvchiga yuborildi!", parse_mode="HTML")

# ==================== 10. TEXT & DOWNLOADER BOSHQARUVI ====================

@bot.message_handler(content_types=['text'])
def message_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    user = get_user(user_id)
    lang = user[2] if user else 'uz'
    text = message.text.strip()

    # TILNI ALMASHTIRISH
    if text in [TEXTS["uz"]["btn_lang"], TEXTS["ru"]["btn_lang"], TEXTS["en"]["btn_lang"]]:
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en")
        )
        bot.send_message(message.chat.id, TEXTS[lang]["select_lang"], reply_markup=markup)
        return

    # BOT HAQIDA (ADMIN UCHUN STATISTIKA, ODDIY ODAM UCHUN TAVSIF)
    if text in [TEXTS["uz"]["btn_info"], TEXTS["ru"]["btn_info"], TEXTS["en"]["btn_info"]]:
        if user_id == ADMIN_ID:
            admin_stats_handler(message)
        else:
            desc = {
                "uz": "🌟 <b>VibeStudio & VibeMusic</b> — TikTok va Instagram uchun estetik Spotify videolarni va musiqalarni 1 daqiqada tayyorlab beruvchi platforma!\n\n👨‍💻 Dasturchi: @IBROXIM_I6\n⚡️ Holat: 100% Faol",
                "ru": "🌟 <b>VibeStudio & VibeMusic</b> — платформа для создания эстетичных видео для TikTok и Instagram за 1 минуту!\n\n👨‍💻 Разработчик: @IBROXIM_I6",
                "en": "🌟 <b>VibeStudio & VibeMusic</b> — create aesthetic Spotify lyric videos and trim audio for TikTok in 1 minute!\n\n👨‍💻 Developer: @IBROXIM_I6"
            }
            bot.send_message(message.chat.id, desc[lang], parse_mode="HTML")
        return

    # DOWNLOADER REJIMI TUGMASI
    if text in [TEXTS["uz"]["btn_downloader"], TEXTS["ru"]["btn_downloader"], TEXTS["en"]["btn_downloader"]]:
        bot.send_message(message.chat.id, TEXTS[lang]["dl_prompt"], parse_mode="HTML")
        return

    # HAVOLA KELGANDA AVTOMATIK YUKLASH (INSTA / TIKTOK / PIN / SNAP)
    if re.search(r'(https?://\S+)', text):
        if not check_sponsor_subscription(user_id):
            sponsor = get_setting('sponsor_channel', '')
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton("📢 Kanalga A'zo Bo'lish", url=f"https://t.me/{sponsor.replace('@','')}"))
            bot.send_message(message.chat.id, TEXTS[lang]["sponsor_alert"], reply_markup=markup)
            return

        bot.send_message(message.chat.id, TEXTS[lang]["dl_processing"])
        media = download_social_media(text)
        
        if media and media.get("url"):
            try:
                bot.send_video(message.chat.id, media["url"], caption="🎬 <b>VibeStudio Downloader orqali yuklandi!</b>\n@ms_mus1c_bot", parse_mode="HTML")
            except Exception:
                bot.send_message(message.chat.id, f"📥 Yuklab olish havolasi:\n{media['url']}")
        else:
            bot.send_message(message.chat.id, TEXTS[lang]["dl_error"])
        return

    bot.send_message(message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

# ==================== 11. AUTO-RECONNECT 24/7 ====================
if __name__ == '__main__':
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass
    time.sleep(2)
    print("VibeStudio Master Engine 24/7 ishga tushdi...")
    while True:
        try:
            bot.infinity_polling(skip_pending=True, timeout=20)
        except Exception as e:
            print(f"Qayta ulanmoqda: {e}")
            time.sleep(3)
