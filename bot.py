import os
import sqlite3
import datetime
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import telebot
from telebot.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, 
    ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
)

# ==================== RENDER HEALTH-CHECK SERVER ====================
# Render botni to'xtatib qo'ymasligi uchun fon veb-serveri
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"VibeBot is Active & 24/7 Running!")

    def log_message(self, format, *args):
        return  # Loglarni to'ldirmaslik uchun

def run_health_server():
    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

threading.Thread(target=run_health_server, daemon=True).start()

# ==================== SOZLAMALAR ====================
BOT_TOKEN = "8824021433:AAEVv5sJ9f5RocgvZKR9zRzX5DOgBd9FzJA"
ADMIN_ID = 6526744258  # Sizning Admin ID raqamingiz
WEBAPP_URL = "https://ibroximxudoyqulov.github.io/vibe-music/?v=1.0"

PHONE_PAYMENT = "+992 007071683"

bot = telebot.TeleBot(BOT_TOKEN, threaded=True, num_threads=20)
user_states = {}  # Foydalanuvchi holatlarini saqlash

# ==================== DATABASE (SQLITE WAL MODE) ====================
def init_db():
    conn = sqlite3.connect("users.db", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")  # 100k userlar uchun tezkor rejim
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            lang TEXT DEFAULT 'ru',
            balance REAL DEFAULT 0.0,
            is_vip INTEGER DEFAULT 0,
            vip_expires TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_user(user_id):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, lang, balance, is_vip, vip_expires FROM users WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def save_user(user_id, username, lang='ru'):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (user_id, username, lang) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET username=excluded.username
    """, (user_id, username, lang))
    conn.commit()
    conn.close()

def set_lang(user_id, lang):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET lang=? WHERE user_id=?", (lang, user_id))
    conn.commit()
    conn.close()

def set_vip(user_id, days=30):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    expires = (datetime.datetime.now() + datetime.timedelta(days=days)).strftime("%Y-%m-%d %H:%M")
    cursor.execute("UPDATE users SET is_vip=1, vip_expires=? WHERE user_id=?", (expires, user_id))
    conn.commit()
    conn.close()

# ==================== MATNLAR LUG'ATI ====================
TEXTS = {
    "uz": {
        "welcome": "Assalomu alaykum! Xush kelibsiz.\nQuyidagi menyudan kerakli bo'limni tanlang:",
        "menu_karaoke": "🎤 Karaoke & Video Yasash",
        "menu_earn": "💰 Reklamadan Pul Ishlash",
        "menu_lang": "🌐 Tilni O'zgartirish",
        "earn_menu": "💰 <b>Reklamadan Pul Ishlash Bo'limi</b>\n\nQuyidagi tugmalardan birini tanlang:",
        "btn_balance": "💳 Balansim",
        "btn_watch_ad": "▶️ Reklama Ko'rish (+ $0.01)",
        "btn_back": "⬅️ Bosh Menyu",
        "balance_text": "💵 <b>Sizning Balansingiz:</b> ${:.2f}\nMinimal yechish summasi: $2.00\nPulni Bank Eskhata, Korti Milli, Click va Paymega yechib olishingiz mumkin.",
        "ad_watched": "🎉 Siz reklama ko'rdingiz va hisobingizga <b>+$0.01</b> qo'shildi!",
        "pay_required": f"🔒 <b>VIP Obuna Talab Qilinadi!</b>\n\nKaraoke yaratish va 70+ shriftlardan foydalanish uchun to'lov qiling:\n\n💳 <b>Bank Eskhata / Korti Milli:</b> <code>{PHONE_PAYMENT}</code>\n💳 <b>Visa:</b> <code>{PHONE_PAYMENT}</code>\n\n💵 <b>Tariflar:</b>\n• 1 Oylik VIP — $1.99 (20 Somoni / 25,000 UZS)\n• 1 Yillik VIP — $14.99 (160 Somoni / 180,000 UZS)\n\nTo'lov qilgach, chek skrinshotini botga yuboring!",
        "send_receipt_btn": "🧾 To'lov Qildim (Chek Yuborish)",
        "ad_karaoke_btn": "🎬 Reklama Ko'rib Video Tayyorlash",
        "wait_admin": "✅ Chekingiz qabul qilindi! Admin tasdiqlashini kuting. Tasdiqlanishi bilan Mini App ochiladi.",
        "vip_active": "🎉 <b>VIP Obunangiz Faol!</b>\n\nMini App orqali cheksiz video yasashingiz mumkin:",
        "open_app_btn": "🎨 VibeStudio Ilovasini Ochish",
        "unknown": "⚠️ Noma'lum buyruq! Iltimos, menyudagi tugmalardan foydalaning."
    },
    "ru": {
        "welcome": "Здравствуйте! Добро пожаловать.\nВыберите нужный раздел из меню ниже:",
        "menu_karaoke": "🎤 Создать Караоке & Видео",
        "menu_earn": "💰 Заработок на Рекламе",
        "menu_lang": "🌐 Сменить Язык",
        "earn_menu": "💰 <b>Раздел Заработка на Рекламе</b>\n\nВыберите действие:",
        "btn_balance": "💳 Мой Баланс",
        "btn_watch_ad": "▶️ Смотреть Рекламу (+ $0.01)",
        "btn_back": "⬅️ Главное Меню",
        "balance_text": "💵 <b>Ваш Баланс:</b> ${:.2f}\nМинимальная сумма вывода: $2.00\nВывод на карты Сбербанк, Тинькофф, Эсхата, Click, Payme и Kaspi.",
        "ad_watched": "🎉 Вы посмотрели рекламу! Вам начислено <b>+$0.01</b> на баланс.",
        "pay_required": f"🔒 <b>Требуется VIP Подписка!</b>\n\nДля создания видео и доступа к 70+ шрифтам оплатите подписку:\n\n💳 <b>Bank Eskhata / Korti Milli:</b> <code>{PHONE_PAYMENT}</code>\n💳 <b>Visa:</b> <code>{PHONE_PAYMENT}</code>\n\n💵 <b>Тарифы:</b>\n• 1 Месяц VIP — $1.99 (20 Сомони / 25,000 UZS)\n• 1 Год VIP — $14.99 (160 Сомони / 180,000 UZS)\n\nПосле оплаты отправьте скриншот чека в этот бот!",
        "send_receipt_btn": "🧾 Я оплатил(а) (Отправить чек)",
        "ad_karaoke_btn": "🎬 Смотреть рекламу и создать видео",
        "wait_admin": "✅ Ваш чек принят! Ожидайте подтверждения администратора. Сразу после этого откроется Mini App.",
        "vip_active": "🎉 <b>Ваша VIP Подписка Активна!</b>\n\nВы можете создавать видео без ограничений:",
        "open_app_btn": "🎨 Открыть VibeStudio",
        "unknown": "⚠️ Неизвестная команда! Пожалуйста, используйте кнопки меню."
    }
}

# ==================== ASOSIY MENYU TUGMALARI ====================
def get_main_menu(lang):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS[lang]["menu_karaoke"]))
    markup.row(KeyboardButton(TEXTS[lang]["menu_earn"]), KeyboardButton(TEXTS[lang]["menu_lang"]))
    return markup

def get_earn_menu(lang):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row(KeyboardButton(TEXTS[lang]["btn_watch_ad"]))
    markup.row(KeyboardButton(TEXTS[lang]["btn_balance"]), KeyboardButton(TEXTS[lang]["btn_back"]))
    return markup

# ==================== HANDLERS ====================

@bot.message_handler(commands=['start'])
def start_handler(message):
    user_id = message.from_user.id
    user = get_user(user_id)
    
    if not user:
        save_user(user_id, message.from_user.username or "user")
        # Til tanlash tugmalari
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru")
        )
        bot.send_message(message.chat.id, "Tilni tanlang / Выберите язык:", reply_markup=markup)
    else:
        lang = user[2] or 'ru'
        bot.send_message(message.chat.id, TEXTS[lang]["welcome"], reply_markup=get_main_menu(lang))


@bot.callback_query_handler(func=lambda call: call.data.startswith('lang_'))
def lang_callback(call):
    lang = call.data.split('_')[1]
    set_lang(call.from_user.id, lang)
    bot.delete_message(call.message.chat.id, call.message.message_id)
    bot.send_message(call.message.chat.id, TEXTS[lang]["welcome"], reply_markup=get_main_menu(lang))


@bot.message_handler(content_types=['text'])
def message_handler(message):
    user_id = message.from_user.id
    user = get_user(user_id)
    lang = user[2] if user else 'ru'
    text = message.text

    # TILNI O'ZGARTIRISH
    if text in [TEXTS["uz"]["menu_lang"], TEXTS["ru"]["menu_lang"]]:
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("🇺🇿 O'zbekcha", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru")
        )
        bot.send_message(message.chat.id, "Tilni tanlang / Выберите язык:", reply_markup=markup)
        return

    # BOSH MENYUGA QAYTISH
    if text in [TEXTS["uz"]["btn_back"], TEXTS["ru"]["btn_back"]]:
        bot.send_message(message.chat.id, TEXTS[lang]["welcome"], reply_markup=get_main_menu(lang))
        return

    # REKLAMADAN PUL ISHLASH MENYUSI
    if text in [TEXTS["uz"]["menu_earn"], TEXTS["ru"]["menu_earn"]]:
        bot.send_message(message.chat.id, TEXTS[lang]["earn_menu"], parse_mode="HTML", reply_markup=get_earn_menu(lang))
        return

    # BALANS KO'RISH
    if text in [TEXTS["uz"]["btn_balance"], TEXTS["ru"]["btn_balance"]]:
        bal = user[3] if user else 0.0
        bot.send_message(message.chat.id, TEXTS[lang]["balance_text"].format(bal), parse_mode="HTML")
        return

    # REKLAMA KO'RISH TUGMASI (Mini App'ga yo'naltirish)
    if text in [TEXTS["uz"]["btn_watch_ad"], TEXTS["ru"]["btn_watch_ad"]]:
        markup = InlineKeyboardMarkup()
        btn_text = "▶️ Reklama Ko'rish (Mini App)" if lang == 'uz' else "▶️ Смотреть Рекламу (Mini App)"
        markup.add(InlineKeyboardButton(text=btn_text, web_app=WebAppInfo(url=WEBAPP_URL)))
        
        msg = (
            "🎬 <b>Haqiqiy reklama ko'rish:</b>\nVideoni oxirigacha tomosha qiling va hisobingizga pul oling!" 
            if lang == 'uz' else 
            "🎬 <b>Просмотр рекламы:</b>\nПосмотрите видео до конца, чтобы получить вознаграждение!"
        )
        bot.send_message(message.chat.id, msg, parse_mode="HTML", reply_markup=markup)
        return

    # KARAOKE YASASH TUGMASI (TO'LOVNI TEKSHIRISH)
    if text in [TEXTS["uz"]["menu_karaoke"], TEXTS["ru"]["menu_karaoke"]]:
        is_vip = user[4] if user else 0
        if is_vip == 1 or user_id == ADMIN_ID:
            # VIP Bor -> Mini App ochamiz
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton(text=TEXTS[lang]["open_app_btn"], web_app=WebAppInfo(url=WEBAPP_URL)))
            bot.send_message(message.chat.id, TEXTS[lang]["vip_active"], parse_mode="HTML", reply_markup=markup)
        else:
            # VIP Yo'q -> To'lov ma'lumotlari chiqadi
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton(text=TEXTS[lang]["send_receipt_btn"], callback_data="send_receipt"))
            markup.add(InlineKeyboardButton(text=TEXTS[lang]["ad_karaoke_btn"], web_app=WebAppInfo(url=WEBAPP_URL)))
            bot.send_message(message.chat.id, TEXTS[lang]["pay_required"], parse_mode="HTML", reply_markup=markup)
        return

    # NOMA'LUM BUYRUQ
    bot.send_message(message.chat.id, TEXTS[lang]["unknown"])


# CHEK YUBORISHNI BOSGANDA
@bot.callback_query_handler(func=lambda call: call.data == "send_receipt")
def receipt_btn_callback(call):
    user_id = call.from_user.id
    user_states[user_id] = "WAITING_RECEIPT"
    user = get_user(user_id)
    lang = user[2] if user else 'ru'
    bot.send_message(call.message.chat.id, "Iltimos, to'lov cheki skrinshotini (rasm) yuboring:")


# CHEK SKRINSHOTINI QABUL QILISH VA ADMINGA YUBORISH
@bot.message_handler(content_types=['photo'])
def photo_handler(message):
    user_id = message.from_user.id
    if user_states.get(user_id) == "WAITING_RECEIPT":
        user_states[user_id] = None
        user = get_user(user_id)
        lang = user[2] if user else 'ru'
        
        # Userga javob
        bot.send_message(message.chat.id, TEXTS[lang]["wait_admin"])

        # ADMINGA CHEK YUBORISH (TASDIQLASH TUGMALARI BILAN)
        file_id = message.photo[-1].file_id
        admin_markup = InlineKeyboardMarkup()
        admin_markup.add(
            InlineKeyboardButton("✅ 1 Oylik VIP Berish", callback_data=f"approve_{user_id}_30"),
            InlineKeyboardButton("🌟 1 Yillik VIP Berish", callback_data=f"approve_{user_id}_365")
        )
        admin_markup.add(InlineKeyboardButton("❌ Rad Etish", callback_data=f"reject_{user_id}"))

        caption = f"🧾 <b>YANGI TO'LOV CHEKI!</b>\n\n👤 User: @{message.from_user.username}\n🆔 ID: <code>{user_id}</code>\nIsm: {message.from_user.first_name}"
        bot.send_photo(ADMIN_ID, file_id, caption=caption, parse_mode="HTML", reply_markup=admin_markup)


# ADMIN TASDIQLASH / RAD ETISH TUGMALARI
@bot.callback_query_handler(func=lambda call: call.data.startswith(('approve_', 'reject_')))
def admin_decision_callback(call):
    if call.from_user.id != ADMIN_ID:
        return

    data = call.data.split('_')
    action = data[0]
    target_user_id = int(data[1])

    if action == "approve":
        days = int(data[2])
        set_vip(target_user_id, days=days)
        bot.edit_message_caption(f"✅ <b>TO'LOV TASDIQLANDI!</b> ({days} kunlik VIP berildi)", call.message.chat.id, call.message.message_id, parse_mode="HTML")

        # Userga xabar yuborish va Mini App linkini berish
        user = get_user(target_user_id)
        lang = user[2] if user else 'ru'
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(text=TEXTS[lang]["open_app_btn"], web_app=WebAppInfo(url=WEBAPP_URL)))
        bot.send_message(target_user_id, f"🎉 <b>To'lovingiz tasdiqlandi!</b> Sizga {days} kunlik VIP berildi.\n\n👇 Mini Appni ochishingiz mumkin:", parse_mode="HTML", reply_markup=markup)

    elif action == "reject":
        bot.edit_message_caption("❌ <b>To'lov rad etildi.</b>", call.message.chat.id, call.message.message_id, parse_mode="HTML")
        bot.send_message(target_user_id, "❌ To'lov chekingiz tasdiqlanmadi. Qaytadan tekshirib yuboring.")


import time

if __name__ == '__main__':
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass
    
    time.sleep(2)  # Eski ulanish to'liq yopilishi uchun 2 soniya kutadi
    
    print("Bot 24/7 uzluksiz ishga tushdi...")
    while True:
        try:
            bot.infinity_polling(skip_pending=True, timeout=20)
        except Exception as e:
            print(f"Qayta ulanmoqda: {e}")
            time.sleep(3)
