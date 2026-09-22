# Telegram Bot & Server Setup Guide (Developer Documentation)

This file contains the backend bot code and deployment instructions for the bot operator / developer. It is intentionally kept separate from the client app so customers never see backend code.

---

## 1. Telegram Bot Code (Python)

Using `python-telegram-bot` (v20+):

```python
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

APP_URL = "https://your-deployed-app-url.com"  # Replace with your app URL

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("Open Wallet (£ GBP) 💳", web_app=WebAppInfo(url=APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        f"👋 Welcome to your Wallet, {update.effective_user.first_name}!\n"
        "Tap below to open your Mini App & deposit funds instantly with Stripe in £ GBP:",
        reply_markup=reply_markup
    )

app = ApplicationBuilder().token("YOUR_TELEGRAM_BOT_TOKEN").build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
```

---

## 2. Setting Up the Menu Button in @BotFather

1. Open Telegram and message `@BotFather`.
2. Send command: `/setmenubutton`
3. Select your bot.
4. Enter the URL of your deployed Web App (e.g. your Render / Cloud Run URL).
5. Name the button: `Open Wallet 💳`

---

## 3. Render / Production Deployment

When deploying on Render or similar hosting (Cloud Run, Railway, etc.):

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `STRIPE_SECRET_KEY`: `sk_live_...` (or `sk_test_...`)
  - `STRIPE_WEBHOOK_SECRET`: `whsec_...`
  - `TELEGRAM_BOT_TOKEN`: Your bot token from @BotFather
  - `PORT`: `3000`

---

## 4. Stripe Webhook Configuration

- **Webhook URL**: `https://your-deployed-app-url.com/api/stripe/webhook`
- **Event to listen for**: `checkout.session.completed`
- Instant balance updates will stream directly to the user's active mini app session via Server-Sent Events (SSE).
