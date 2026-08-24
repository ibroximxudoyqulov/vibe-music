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
        self.wfile.write(b"<h1>VibeStudio Enterprise Master Bot is 100% Active!</h1>")

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
ADMIN_ID = 6526744258  # Sizning Admin ID raqamingiz
SECRET_CHANNEL_ID = -1004428420836  # Buyurtmalar va Arxiv Maxfiy Kanali
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=master_v1"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=25)
user_states = {}

# ==================== 3. SQLITE WAL BAZA ====================
def init_db():
    conn = sqlite3.connect("users.db", timeout=15, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    
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
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # Standart narxlar
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_uz_pro', '25')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_uz_vip', '75')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ru_pro', '50')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_ru_vip', '150')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_en_pro', '125')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('price_en_vip', '350')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('custom_bot_price_stars', '700')")
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

# ==================== 4. LUG'AT (3 TA TILDA SOF) ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! <b>VibeStudio</b> ekotizimiga xush kelibsiz. 🎧✨\n\n🎬 Spotify videolar yasash, audioni qirqish, media yuklash va shaxsiy bot buyurtma qilish platformasi!\n\n👇 Quyidagi menyudan kerakli bo'limni tanlang:",
        "btn_open_app": "🎨 VibeStudio Ilovasi (Mini App)",
        "btn_downloader": "📥 Video Yuklash (Insta/TikTok/Pin)",
        "btn_create_bot": "🤖 Shaxsiy Bot Yasash (B2B)",
        "btn_packages": "⭐ VIP & PRO Tariflar",
        "btn_lang": "🌐 Tilni O'zgartirish",
        "btn_info": "ℹ️ Bot Haqida",
        "dl_prompt": "📥 <b>Universal Media Yuklovchi:</b>\n\nTikTok, Instagram (Reels), Pinterest yoki Snapchat havolasini yuboring:",
        "dl_processing": "⏳ Video tahlil qilinmoqda va yuklab olinmoqda...",
        "dl_error": "⚠️ Havoladan video yuklab bo'lmadi. Havola ochiq va to'g'riligini tekshiring!",
        "sponsor_alert": "📢 <b>Xizmatdan foydalanish uchun homiy kanalimizga obuna bo'ling:</b>",
        "select_lang": "Tilni tanlang / Choose language / Выберите язык:"
    },
    "ru": {
        "welcome": "Здравствуйте! Добро пожаловать в <b>VibeStudio</b>. 🎧✨\n\n🎬 Создание Spotify видео, нарезка аудио, скачивание медиа и разработка ботов на заказ!\n\n👇 Выберите нужный раздел:",
        "btn_open_app": "🎨 Приложение VibeStudio",
        "btn_downloader": "📥 Скачать Видео (Insta/TikTok/Pin)",
        "btn_create_bot": "🤖 Создать Своего Бота (B2B)",
        "btn_packages": "⭐ VIP & PRO Тарифы",
        "btn_lang": "🌐 Сменить Язык",
        "btn_info": "ℹ️ О Боте",
        "dl_prompt": "📥 <b>Универсальный Загрузчик:</b>\n\nОтправьте ссылку на TikTok, Instagram (Reels), Pinterest или Snapchat:",
        "dl_processing": "⏳ Загрузка и обработка видео...",
        "dl_error": "⚠️ Не удалось скачать видео. Проверьте правильность ссылки!",
        "sponsor_alert": "📢 <b>Для использования подпишитесь на спонсорский канал:</b>",
        "select_lang": "Tilni tanlang / Choose language / Выберите язык:"
    },
    "en": {
        "welcome": "Welcome to <b>VibeStudio</b>! 🎧✨\n\n🎬 The #1 Platform for aesthetic Spotify videos, audio trimming, media downloader & custom Telegram bot creation!\n\n👇 Select an option below:",
        "btn_open_app": "🎨 Open VibeStudio App",
        "btn_downloader": "📥 Download Media (Insta/TikTok/Pin)",
        "btn_create_bot": "🤖 Build Custom Bot (B2B)",
        "btn_packages": "⭐ VIP & PRO Subscriptions",
        "btn_lang": "🌐 Change Language",
        "btn_info": "ℹ️ About Platform",
        "dl_prompt": "📥 <b>Universal Media Downloader:</b>\n\nSend any TikTok, Instagram (Reels), Pinterest, or Snapchat link:",
        "dl_processing": "⏳ Processing and downloading video...",
        "dl_error": "⚠️ Could not download media. Please ensure the link is public and valid!",
        "sponsor_alert": "📢 <b>Please join our sponsor channel to continue:</b>",
        "select_lang": "Tilni tanlang / Choose language / Выберите язык:"
    }
}

def get_main_menu(lang):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS[lang]["btn_open_app"], web_app=WebAppInfo(url=WEBAPP_URL)))
    markup.row(KeyboardButton(TEXTS[lang]["btn_downloader"]), KeyboardButton(TEXTS[lang]["btn_create_bot"]))
    markup.row(KeyboardButton(TEXTS[lang]["btn_packages"]), KeyboardButton(TEXTS[lang]["btn_lang"]))
    markup.row(KeyboardButton(TEXTS[lang]["btn_info"]))
    return markup

# ==================== 5. UNIVERSAL DOWNLOADER ====================
def download_social_media(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    try:
        if "tiktok.com" in url:
            res = requests.post("https://www.tikwm.com/api/", data={"url": url, "hd": 1}, headers=headers, timeout=12).json()
            if res.get("code") == 0 and res.get("data"):
                video_url = res["data"].get("play") or res["data"].get("hdplay") or res["data"].get("wmplay")
                return {"type": "video", "url": video_url, "title": res["data"].get("title", "TikTok Video")}
        
        cobalt_res = requests.post("https://api.cobalt.tools/api/json", json={"url": url, "vQuality": "720"}, headers={"Accept": "application/json", "Content-Type": "application/json", "User-Agent": headers['User-Agent']}, timeout=12).json()
        if cobalt_res.get("url"):
            return {"type": "video", "url": cobalt_res["url"], "title": "Social Video"}
    except Exception as e:
        print(f"[Downloader Error] {e}")
    return None

def check_sponsor_subscription(user_id):
    sponsor = get_setting('sponsor_channel', '')
    if not sponsor: return True
    try:
        member = bot.get_chat_member(sponsor, user_id)
        if member.status in ['member', 'administrator', 'creator']: return True
    except Exception: return True
    return False

# ==================== 6. ASOSIY START & TIL ====================
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

# ==================== 7. SHAXSIY BOT YASASH STUDIYASI (B2B BUYURTMA) ====================

@bot.message_handler(func=lambda m: m.text in [TEXTS["uz"]["btn_create_bot"], TEXTS["ru"]["btn_create_bot"], TEXTS["en"]["btn_create_bot"]])
def custom_bot_flow_start(message):
    user_id = message.from_user.id
    user_states[user_id] = {'step': 'choose_type'}
    
    markup = InlineKeyboardMarkup()
    markup.add(
        InlineKeyboardButton("🤖 AI Aqlli Bot (ChatGPT)", callback_data="btype_ai"),
        InlineKeyboardButton("⚡️ Standart Biznes Bot", callback_data="btype_standard")
    )
    bot.send_message(message.chat.id, "💼 <b>1-Qadam:</b> Qanday turdagi bot yaratmoqchisiz?", parse_mode="HTML", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith('btype_'))
def custom_bot_type_callback(call):
    user_id = call.from_user.id
    b_type = "AI Aqlli Bot (ChatGPT)" if call.data == "btype_ai" else "Standart Biznes Bot"
    user_states[user_id] = {'step': 'choose_category', 'type': b_type}
    
    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("☕️ Kafe & Restoran", callback_data="bcat_kafe"),
        InlineKeyboardButton("💊 Apteka", callback_data="bcat_apteka"),
        InlineKeyboardButton("👗 Kiyim Do'koni", callback_data="bcat_kiyim"),
        InlineKeyboardButton("🛒 Oziq-ovqat Do'koni", callback_data="bcat_market"),
        InlineKeyboardButton("🏨 Mehmonxona", callback_data="bcat_hotel"),
        InlineKeyboardButton("🏭 Zavod / Kompaniya", callback_data="bcat_company"),
        InlineKeyboardButton("👤 Shaxsiy Bot / Portfolio", callback_data="bcat_personal")
    )
    bot.edit_message_text("🏢 <b>2-Qadam:</b> Botingiz qaysi soha uchun mo'ljallangan?", call.message.chat.id, call.message.message_id, parse_mode="HTML", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith('bcat_'))
def custom_bot_cat_callback(call):
    user_id = call.from_user.id
    cats = {
        'bcat_kafe': '☕️ Kafe & Restoran', 'bcat_apteka': '💊 Apteka',
        'bcat_kiyim': "👗 Kiyim Do'koni", 'bcat_market': '🛒 Oziq-ovqat Do'koni',
        'bcat_hotel': '🏨 Mehmonxona', 'bcat_company': '🏭 Zavod / Kompaniya',
        'bcat_personal': '👤 Shaxsiy Bot'
    }
    selected_cat = cats.get(call.data, 'Biznes Bot')
    
    if user_id in user_states:
        user_states[user_id]['category'] = selected_cat
        user_states[user_id]['step'] = 'enter_details'
    
    bot.edit_message_text(
        "📝 <b>3-Qadam:</b> Botingiz qanday vazifalarni bajarishi kerak? O'z fikringiz va <b>telefon raqamingizni</b> yozib qoldiring:\n\n<i>(Masalan: Kiyimlar katalogi va buyurtma qabul qilish kerak, +998901234567)</i>",
        call.message.chat.id, call.message.message_id, parse_mode="HTML"
    )

# ADMINNING BUYURTMANI TASDIQLASHI YOKI RAD ETISHI
@bot.callback_query_handler(func=lambda call: call.data.startswith(('botorder_accept_', 'botorder_reject_')))
def admin_bot_decision(call):
    if call.from_user.id != ADMIN_ID:
        return
    
    parts = call.data.split('_')
    action = parts[1]
    target_user_id = int(parts[2])
    stars = int(parts[3]) if len(parts) > 3 else 700
    
    if action == "accept":
        bot.edit_message_caption("✅ <b>BUYURTMA ADMIN TOMONIDAN QABUL QILINDI!</b> (Mijozga to'lov hisobi yuborildi)", call.message.chat.id, call.message.message_id, parse_mode="HTML")
        
        # Mijozga to'lov hisobini (Invoice) yuborish
        prices = [LabeledPrice(label="Shaxsiy Bot Oylik Xizmat", amount=stars)]
        bot.send_message(target_user_id, "🎉 <b>Tabriklaymiz!</b> Sizning shaxsiy bot buyurtmangiz admin tomonidan qabul qilindi.\n\n👇 Oylik to'lovni Telegram Stars bilan amalga oshiring:")
        bot.send_invoice(
            chat_id=target_user_id,
            title="Shaxsiy Bot Oylik Xizmati",
            description="Telegram botingizni 24/7 yuritish, server va texnik xizmat",
            invoice_payload=f"botorder_{target_user_id}",
            provider_token="",
            currency="XTR",
            prices=prices
        )
    elif action == "reject":
        bot.edit_message_caption("❌ <b>Buyurtma rad etildi.</b>", call.message.chat.id, call.message.message_id, parse_mode="HTML")
        bot.send_message(target_user_id, "⚠️ Afsuski, sizning bot buyurtmangiz hozirda qabul qilinmadi. Qo'shimcha savollar bo'lsa adminga murojaat qiling: @IBROXIM_I6")

# ==================== 8. TELEGRAM STARS (⭐) TO'LOV VA TARIFLAR ====================

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
        provider_token="",
        currency="XTR",
        prices=prices
    )

@bot.pre_checkout_query_handler(func=lambda query: True)
def pre_checkout_handler(pre_checkout_query):
    bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@bot.message_handler(content_types=['successful_payment'])
def successful_payment_handler(message):
    payload = message.successful_payment.invoice_payload
    user_id = message.from_user.id
    
    if payload.startswith('sub_'):
        tier = payload.split('_')[1]
        set_user_tier(user_id, tier, 30)
        bot.send_message(user_id, f"🎉 <b>Tabriklaymiz!</b> Sizning <b>{tier.upper()}</b> obunangiz 30 kunga faollashtirildi!")
        caption = f"⭐ <b>YANGI OBUNA TO'LOVI!</b>\n👤 User: @{message.from_user.username} (<code>{user_id}</code>)\n📦 Paket: {tier.upper()}\n💰 Summa: {message.successful_payment.total_amount} Stars"
        bot.send_message(SECRET_CHANNEL_ID, caption, parse_mode="HTML")
    elif payload.startswith('botorder_'):
        bot.send_message(user_id, "🎉 <b>To'lovingiz qabul qilindi!</b> Dasturchi tez orada siz bilan bog'lanib, botingizni ishga tushirib beradi.")
        caption = f"💰 <b>SHAXSIY BOT TO'LOVI QABUL QILINDI!</b>\n👤 Mijoz: @{message.from_user.username} (<code>{user_id}</code>)\n💰 Summa: {message.successful_payment.total_amount} Stars"
        bot.send_message(SECRET_CHANNEL_ID, caption, parse_mode="HTML")

# ==================== 9. ADMIN KONSOLI ====================

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

@bot.message_handler(commands=['sponsor'])
def set_sponsor_handler(message):
    if message.from_user.id != ADMIN_ID: return
    channel = message.text.replace('/sponsor', '').strip()
    if channel:
        set_setting('sponsor_channel', channel)
        bot.send_message(message.chat.id, f"✅ Majburiy sponsor kanali o'rnatildi: <b>{channel}</b>", parse_mode="HTML")

@bot.message_handler(commands=['unsponsor'])
def remove_sponsor_handler(message):
    if message.from_user.id != ADMIN_ID: return
    set_setting('sponsor_channel', '')
    bot.send_message(message.chat.id, "✅ Majburiy homiylik obunasi butunlay o'chirildi!")

@bot.message_handler(commands=['price'])
def set_price_handler(message):
    if message.from_user.id != ADMIN_ID: return
    try:
        parts = message.text.split()
        region, tier, amount = parts[1].lower(), parts[2].lower(), int(parts[3])
        set_setting(f"price_{region}_{tier}", amount)
        bot.send_message(message.chat.id, f"✅ Narx yangilandi: <b>{region.upper()} {tier.upper()} = {amount} ⭐</b>", parse_mode="HTML")
    except Exception:
        bot.send_message(message.chat.id, "⚠️ Format: <code>/price uz pro 30</code>")

@bot.message_handler(commands=['broadcast'])
def broadcast_handler(message):
    if message.from_user.id != ADMIN_ID: return
    msg_text = message.text.replace('/broadcast', '').strip()
    if not msg_text: return
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
        except Exception: pass
    bot.send_message(message.chat.id, f"✅ Xabar <b>{sent} ta</b> foydalanuvchiga yuborildi!", parse_mode="HTML")

# ==================== 10. TEXT & CATCH-ALL ROUTER ====================

@bot.message_handler(content_types=['text'])
def message_handler(message):
    user_id = message.from_user.id
    save_user(user_id, message.from_user.username or "user", "uz")
    user = get_user(user_id)
    lang = user[2] if user else 'uz'
    text = message.text.strip()

    # SHAXSIY BOT BUYURTMASINING MATNI VA TELEFONI KELGANDA
    if user_id in user_states and user_states[user_id].get('step') == 'enter_details':
        u_type = user_states[user_id].get('type', 'Biznes Bot')
        u_cat = user_states[user_id].get('category', 'Kompaniya')
        user_states[user_id] = None # Reset state

        stars_price = int(get_setting('custom_bot_price_stars', '700'))
        
        # Mijozga hisobot
        bot.send_message(
            message.chat.id,
            f"✅ <b>Buyurtmangiz qabul qilindi va adminga yuborildi!</b>\n\n"
            f"🤖 <b>Bot Turi:</b> {u_type}\n"
            f"🏢 <b>Soha:</b> {u_cat}\n"
            f"📝 <b>Fikringiz:</b> {text}\n"
            f"💰 <b>Oylik xizmat haqi:</b> 350,000 UZS ({stars_price} ⭐ Stars)\n\n"
            f"<i>Admin buyurtmangizni tasdiqlashi bilan hisob yuboriladi!</i>",
            parse_mode="HTML"
        )

        # ADMINGA VA MAXFIY KANALGA YUBORISH (QABUL / RAD TUGMALARI BILAN)
        admin_markup = InlineKeyboardMarkup()
        admin_markup.add(
            InlineKeyboardButton("✅ Qabul Qilish (Hisob Chiqarish)", callback_data=f"botorder_accept_{user_id}_{stars_price}"),
            InlineKeyboardButton("❌ Rad Etish", callback_data=f"botorder_reject_{user_id}")
        )

        admin_caption = (
            f"🛎 <b>YANGI SHAXSIY BOT BUYURTMASI!</b>\n\n"
            f"👤 <b>Mijoz:</b> @{message.from_user.username} (<code>{user_id}</code>)\n"
            f"🤖 <b>Turi:</b> {u_type}\n"
            f"🏢 <b>Soha:</b> {u_cat}\n"
            f"📝 <b>Mijoz Fikri & Tel:</b>\n{text}\n\n"
            f"💰 <b>Belgilangan Oylik Narx:</b> 350,000 UZS ({stars_price} Stars)"
        )
        bot.send_message(SECRET_CHANNEL_ID, admin_caption, parse_mode="HTML", reply_markup=admin_markup)
        bot.send_message(ADMIN_ID, admin_caption, parse_mode="HTML", reply_markup=admin_markup)
        return

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

    # BOT HAQIDA
    if text in [TEXTS["uz"]["btn_info"], TEXTS["ru"]["btn_info"], TEXTS["en"]["btn_info"]]:
        if user_id == ADMIN_ID:
            admin_stats_handler(message)
        else:
            desc = {
                "uz": "🌟 <b>VibeStudio & VibeMusic</b> — TikTok va Instagram uchun estetik Spotify videolarni va musiqalarni 1 daqiqada tayyorlab beruvchi platforma!\n\n👨‍💻 Dasturchi: @IBROXIM_I6\n⚡️ Holat: 100% Bepul",
                "ru": "🌟 <b>VibeStudio & VibeMusic</b> — платформа для создания эстетичных видео для TikTok и Instagram за 1 минуту!\n\n👨‍💻 Разработчик: @IBROXIM_I6",
                "en": "🌟 <b>VibeStudio & VibeMusic</b> — create aesthetic Spotify lyric videos and trim audio for TikTok in 1 minute!\n\n👨‍💻 Developer: @IBROXIM_I6"
            }
            bot.send_message(message.chat.id, desc[lang], parse_mode="HTML")
        return

    # DOWNLOADER TUGMASI
    if text in [TEXTS["uz"]["btn_downloader"], TEXTS["ru"]["btn_downloader"], TEXTS["en"]["btn_downloader"]]:
        bot.send_message(message.chat.id, TEXTS[lang]["dl_prompt"], parse_mode="HTML")
        return
# HAVOLANI MATN ICHIDAN TOZA AJRATIB OLISH VA TOZALASH
    url_match = re.search(r'(https?://[^\s]+)', text)
    if url_match:
        clean_url = url_match.group(1).split('?')[0] if "tiktok.com" in url_match.group(1) else url_match.group(1)
        
        if not check_sponsor_subscription(user_id):
            sponsor = get_setting('sponsor_channel', '')
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton("📢 Kanalga A'zo Bo'lish", url=f"https://t.me/{sponsor.replace('@','')}"))
            bot.send_message(message.chat.id, TEXTS[lang]["sponsor_alert"], reply_markup=markup)
            return

        wait_msg = bot.send_message(message.chat.id, TEXTS[lang]["dl_processing"])
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
            except Exception:
                bot.send_video(message.chat.id, media["url"], caption="🎬 @ms_mus1c_bot")
        else:
            bot.send_message(message.chat.id, TEXTS[lang]["dl_error"])
        return

    bot.send_message(message.chat.id, TEXTS[lang]["welcome"], parse_mode="HTML", reply_markup=get_main_menu(lang))

# ==================== 11. 24/7 AUTO-RECONNECT ====================
if __name__ == '__main__':
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass
    time.sleep(2)
    print("VibeStudio Enterprise Master Bot 24/7 ishga tushdi...")
    while True:
        try:
            bot.infinity_polling(skip_pending=True, timeout=20)
        except Exception as e:
            print(f"Qayta ulanmoqda: {e}")
            time.sleep(3)
