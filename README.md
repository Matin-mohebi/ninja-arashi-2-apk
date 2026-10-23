<div align="center">

# ⚡🥷 NINJA ZEUS

**نینجا زئوس** — دو بازی در یک اپ: پلتفرمر اکشن سایه‌ای + دوندهٔ بی‌پایان سه‌بعدی «حالت زئوس»

A dark-silhouette ninja action platformer **plus** an endless 3D runner (Zeus Mode) — packaged as a native Android APK, desktop app and web game.

</div>

<div align="center">

![Platform](https://img.shields.io/badge/platform-Android%206%2B-green)
![Engine](https://img.shields.io/badge/render-Canvas%202D%20%2B%20Three.js%20%2B%20React%2019-red)
![Wrapper](https://img.shields.io/badge/wrapper-Capacitor%207-blue)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-orange)
![Size](https://img.shields.io/badge/APK-~7%20MB-yellow)

</div>

---

<div align="center">

## ⬇️ دانلود | Download

**📱 [دانلود APK اندروید — NINJA-ZEUS-v1.4.0.apk (~7 MB)](../../releases/download/v1.4.0/NINJA-ZEUS-v1.4.0.apk)**

**🪟 [دانلود برای ویندوز — NINJA-ZEUS-v1.4.0-win-x64.zip (~10 MB)](../../releases/download/v1.4.0/NINJA-ZEUS-v1.4.0-win-x64.zip)** — خارج کنید و `NINJA-ZEUS-win_x64.exe` را اجرا کنید (ویندوز ۱۰/۱۱)

**🐧 [نسخه لینوکس — NINJA-ZEUS-v1.4.0-linux-x64.zip](../../releases/download/v1.4.0/NINJA-ZEUS-v1.4.0-linux-x64.zip)** — `chmod +x NINJA-ZEUS-linux_x64 && ./NINJA-ZEUS-linux_x64`

**🌐 [بازی آنلاین در مرورگر (بدون نصب)](https://matin-mohebi.github.io/ninja-arashi-2-apk/)** | [Releases](../../releases)

</div>

---

## 📖 درباره بازی | About

**فارسی:**
دو بازی در یک اپ: (۱) نبرد شینوبی در دنیای تاریکی و شمشیر و (۲) حالت زئوس، دوندهٔ بی‌پایان سه‌بعدی در معبد زئوس! یک پلتفرمر اکشن با سبک ظاهری «سایه‌ها» (dark silhouette)، شامل مبارزه با کاتانا، پرتاب شوریکن، دَش سایه، جادوی مبدل (Kawarimi)، تله‌های مرگبار و باس‌فایت. بازی کاملاً **آفلاین** است و رابط کاربری فارسی/انگلیسی دارد.

**English:**
A side-scrolling action platformer featuring katana combat, shuriken throws, phantom dash, disguise ninjutsu, deadly traps, and boss battles across 3 levels with a persistent upgrade system (Dojo). 100% offline — no network permission required at runtime beyond the WebView engine.

## ✨ ویژگی‌ها | Features

- ⚔️ **Combat:** katana slash combos, shurikens with recharge, phantom dash (i-frames), disguise ninjutsu
- 🏯 **4 handcrafted levels** + boss fight, checkpoints, secret scrolls (3 per level), coins & diamonds
- 🛡️ **Dojo upgrade system** (health, katana, shuriken, dash, disguise) persisted via `localStorage`
- 👘 **7 skins** with unlock thresholds and unique trail particles (آراشی، شبح سرخ، رونین، زرین، یخ، اخگر، سایهٔ بنفش)
- 🎵 **Real soundtrack:** 8 synthesized OGG Vorbis tracks (Persian/Hijaz-flavored) with gapless loops, crossfade + per-level themes
- 🌐 **Bilingual UI:** Persian (default) / English, RTL-aware
- 🏅 **Stats & 10 achievements** with toast unlocks, best times, lifetime stats
- 🌸 Themed parallax skies, weather particles (fireflies/snow/embers/petals), screen shake, hit-stop & dash ghosts
- ⚡ **Zeus Mode (v1.4.0):** endless 3D auto-runner built on Three.js — swipe to change lanes, tap to jump, collect gems, dodge spikes/blades, 3 hearts, WebAudio synth SFX, procedural Zeus backdrop with bloom, adaptive quality for low-end phones, persistent best score

## 📱 بهینه‌سازی موبایل | Mobile Optimizations

| مورد | توضیح |
|---|---|
| 🖼️ HiDPI Rendering | Canvas backing store × `min(devicePixelRatio, 2)` — تصویر شارپ روی صفحات رتینا |
| 🔒 Orientation | قفل `sensorLandscape` — فقط حالت افقی (با پشتیبانی چرخش ۱۸۰°) |
| 🖥️ Immersive Mode | نوار وضعیت/ناوبری مخفی، فقط با کشیدن از لبه ظاهر می‌شوند |
| 🔤 Offline Fonts | وزیرمتن + Cinzel + Jakarta داخل APK (woff2، بدون CDN) |
| ⬅️ Back Button | حین بازی = توقف (Pause)؛ در توقف = ادامه؛ دو بار در منو = خروج |
| 🔋 Keep Screen On | صفحه حین بازی خاموش نمی‌شود |
| ✂️ Notch Safe-Area | HUD و دکمه‌ها با `env(safe-area-inset-*)` از ناچ فاصله می‌گیرند |
| 🙅 Touch Chrome | منوی لمس طولانی، انتخاب متن و زوم دوبل‌تپ غیرفعال شده |
| 🔄 Rotate Hint | در وب، اگر گوشی عمودی باشد راهنمای «گوشی را بچرخانید» نشان داده می‌شود |
| 📐 Dynamic Viewport | چیدمان با `100dvh` — بدون جاافتادن پشت نوار مرورگر موبایل |
| ⏸️ Auto-Pause | رفتن به پس‌زمینه = توقف خودکار بازی و موزیک |

## ⚡ تغییرات v1.4.0 | What's New

- ⚡ **حالت زئوس اضافه شد — کد شما، داخل بازی اصلی!** پروتوتایپ Three.js رانر به‌صورت یک حالت کامل در منوی اصلی یکپارچه شد؛ دکمهٔ «حالت زئوس» با تم فیروزه‌ای زیر دکمهٔ شروع
- 🏃 **گیم‌پلی:** اجرای خودکار، ۳ لاین، پرش با لمس/کلیک/Space، تغییر لاین با کشیدن انگشت یا A/D، الماس‌های چرخان، موانع (تیغ، بلوک، تیغهٔ چرخان)، سکوهای معمولی/یخی/شکستنی، ۳ جان + بی‌ضرری موقت، سرعت فزاینده
- 🎨 **تم زئوس:** پس‌زمینهٔ پروسیجرال (برق‌ها + نقش یونانی)، بلوم، ذرات، سیلوئت نینجا با شمشیر و شال و هالهٔ درخشان
- 🐞 **رفع باگ‌های پروتوتایپ:** زنجیره‌های `||` جاافتاده در هندلر کیبورد، متغییر تعریف‌نشدهٔ `time`، اسکرول پس‌زمینه (`material.map.offset`، نه `material.offset`)، نور DirectionalLight بدون target، خوابیده‌بودن تیغ‌ها (اسپایک حالا رو به بالاست)، تداخل کلیک+لمس در موبایل، هم‌پوشانی پلتفرم‌ها، گارانتی حداقل یک لاین آزاد در هر بخش، نشت حافظهٔ لبه‌های سکو، پس‌زمینهٔ جاافتاده پس از ~۱۰۰ واحد حرکت
- 📱 **بهینه‌سازی موبایل:** سقف pixel-ratio، سایهٔ ۱۰۲۴ یا خاموش روی دستگاه‌های ضعیف، ذرات کمتر، AudioContext تنبل با ژست کاربر
- 🏆 ذخیرهٔ رکورد (Best) در حافظهٔ دستگاه + نمایش در HUD و پایان بازی
- 🏷️ **تغییر نام بازی به NINJA ZEUS** — اپ اندروید، دسکتاپ، وب، آیکون پنجره و همهٔ خروجی‌های CI

🪟 تغییرات v1.3.0 | What's New

- 🖥️ **نسخه ویندوز و لینوکس اضافه شد!** — بازی حالا به‌صورت اپ دسکتاپ با پوستهٔ سبک Neutralino (WebView2) اجرا می‌شود؛ فقط ~۱۰ مگابایت — بدون Electron سنگین
- 🪟 ویندوز: ZIP را باز کنید و `NINJA-ZEUS-win_x64.exe` را اجرا کنید (ویندوز ۱۰/۱۱ با WebView2)
- 🐧 لینوکس: `chmod +x NINJA-ZEUS-linux_x64 && ./NINJA-ZEUS-linux_x64`
- 🎨 آیکون اختصاصی بازی (شوریکن) برای پنجره، فاوآیکون و دسکتاپ
- 🤖 ساخت و انتشار دسکتاپ هم کاملاً خودکار شد — با هر ریلیز، ZIP ویندوز و لینوکس هم به Releases اضافه می‌شود

## 🩹 تغییرات v1.2.1 | What's Changed

- 📦 **حجم APK از ~۳۷ مگابایت به ~۱۱ مگابایت کاهش یافت** — موسیقی با حفظ فرمت و کیفیت شنیداری بازکدگذاری شد (Vorbis ۶۴–۸۰ کیلوبیت)، تمام اسپلش‌های PNG به WebP بهینه تبدیل شدند (~۱۵MB → ~۰.۷MB)، تصاویر پس‌زمینه فشرده و تصویر بلااستفاده حذف شد
- 🔐 **APK رسماً امضا شد** — ساخت Release با keystore اختصاصی؛ نسخه‌های بعدی بدون حذف بازی، مستقیم روی هم نصب می‌شوند
- 🔢 **همگام‌سازی خودکار نسخه** — `versionName` و `versionCode` اندروید مستقیم از `package.json` خوانده می‌شوند (۱.۲.۱ ← ۱۰۲۰۱)؛ دیگر هیچ‌وقت با نسخه ریلیز گیتهاب ناهماهنگ نمی‌شود
- 🤖 **انتشار خودکار** — workflow جدید: هر ریلیز/تگ، APK امضاشده را مستقیم به GitHub Releases پیوست می‌کند؛ وب هم با هر push به main روی GitHub Pages مستقر می‌شود
- 🗜️ minify + shrinkResources در ساخت Release فعال شد

## 🚀 تغییرات v1.2.0 | What's New

- 🎵 **موسیقی واقعی بازی** — ۸ قطعه OGG سنتزشده با گام فارسی/حجاز (D Hijaz): منو، ۴ مرحله، باس، پیروزی و باخت؛ لوپ بی‌درز، کراس‌فید ۰.۸ ثانیه‌ای، پیش‌بارگذاری تنبل هر مرحله و توقف/ادامه هوشمند
- 🏯 **مرحله ۴: «معبد سپیده»** — سه بخش تازه: پله‌های صعودی با چاله‌های خاردار، گانتلت پرش روی سکوهای شناور بر خلا، و تال گنج محافظت‌شده با طومار مخفی نهایی
- 🌅 **پالت سپیده‌دم** — آسمان طلایی/صورتی/بنفش، سکوهای ماسه‌سنگ، ستون‌های معبد و گلبرگ‌های نور
- 🌤️ **آسمان و پارالاکس تم‌محور** — گرادیان آسمان اختصاصی هر مرحله + ۲ لایه سیلوئت متحرک (کوه/بامبو/ستون/پاگودا) با ضریب ۰.۲× و ۰.۴× دوربین
- 🌸 **ذرات هوا‌شناسی هر مرحله** — کرم شب‌تاب و غبار (مرحله ۱)، برف (مرحله ۲)، جرقه‌های بالارونده (مرحله ۳)، گلبرگ (مرحله ۴) — سقف ۴۰ ذره و غیرفعال در حالت کم‌ذره
- 👘 **۳ اسکین جدید** — «یخ» (آبی یخی، رد بلور)، «اخگر» (نارنجی، جرقه آتش)، «سایهٔ بنفش» (بنفش عمیق، مه بنفش) با آستانه‌های باز شدن سکه/طومار
- 🏠 **منوی اصلی متحرک** — پس‌زمینه پارالاکس + ذرات شناور + عنوان درخشان؛ منوی توقف دکمه «بازگشت به منو» و «تنظیمات» گرفت
- 🏅 **آمار و دستاوردها** — بهترین زمان هر مرحله، مجموع مرگ‌ها، سکه‌های عمر، پرش‌ها، زمان بازی + ۱۰ دستاورد با توست باز شدن و وضعیت قفل/باز در مودال آمار
- ⚙️ **تنظیمات جدید** — بلندی موسیقی و جلوه‌های صوتی، لرزش صفحه، حالت کم‌ذره، زبان — ذخیره و اعمال فوری
- 💥 **آب‌وهوای بازی (Juice)** — لرزش صفحه هنگام آسیب و کوبش باس (قابل خاموش‌کردن)، توقف لحظه‌ای (hit-stop) هنگام کشتن دشمن، شبح‌های رد دش با رنگ اسکین، گردوخاک فرود
- 🔒 سازگار با سیوهای قدیمی — شکل شیء ذخیره تغییر نکرده؛ آمار و دستاوردها در کلید جداگانه merge-safe ذخیره می‌شوند

## 🩹 تغییرات v1.1.0 | What's Fixed

- 🚪 **مرحله ۳ قابل عبور شد** — دیوار ورود باس‌آرنا تا زمین ادامه داشت و گذر زمینی را کاملاً می‌بست؛ حالا دروازه ورود باز است
- 🏁 **سیستم چک‌پوینت فعال شد** — پس از مرگ، از آخرین چک‌پوینت روشن‌شده ادامه می‌دهید (قبلاً از ابتدای مرحله)
- 🔄 **چرخش گوشی در وب محکم‌تر شد** — اعمال مجدد اندازه صفحه در ۱۲۰/۴۰۰/۹۰۰ میلی‌ثانیه + رفرش بوم حتی حین توقف
- 🎵 **موزیک پس‌زمینه شروع می‌شود** — تا الان هرگز استارت نمی‌خورد (نیاز به unlock ژست لمسی)
- 🕹️ **ورودی گیرکرده حذف شد** — دکمه‌های لمسی `touchcancel` و پاک‌سازی کلیدها هنگام توقف/ادامه
- 🐺 **دشمنان دیگر از لبه سقوط نمی‌کنند** — چک زمین قبل از حرکت تعقیبی
- 👘 **اسکین‌ها برای همیشه آنلاک می‌مانند** — قبلاً با خرج سکه‌ها دوباره قفل می‌شدند
- ⏯️ توقف خودکار در پس‌زمینه + دکمه Back هوشمند (بستن مودال / ادامه بازی)
- 🛡️ جلوگیری از اجرای دوباره حلقه بازی (دو برابر شدن سرعت) + بهینه‌سازی GC حلقه rAF

## 🏗️ ساختار پروژه | Project Structure

```
├── src/
│   ├── engine/NinjaEngine.ts    # موتور بازی کمپین (۱۷۰۰+ خط): فیزیک، دوربین، رندر
│   ├── zeus/ZeusGame.ts         # موتور حالت زئوس (Three.js): دوندهٔ بی‌پایان سه‌بعدی
│   ├── levels/levelsData.ts     # داده مراحل
│   ├── components/              # HUD، کنترل لمسی مجازی، مودال‌ها
│   ├── audio/soundManager.ts    # سینتی‌سایزر صوتی (Web Audio)
│   ├── utils/mobile.ts          # پل اندروید: Back، خروج، Suppress لمس
│   └── assets/fonts/            # فونت‌های آفلاین woff2
├── android/                     # پروژه بومی Capacitor 7
│   └── app/src/main/java/.../MainActivity.java  # Immersive + Cutout
└── .github/workflows/build-apk.yml   # CI: بیلد خودکار APK
```

## 🔨 بیلد محلی | Build Locally

```bash
npm install          # or: npm install --legacy-peer-deps
npm run build        # vite build → dist/
npx cap sync android # copy web assets into Android project
cd android
./gradlew assembleDebug   # → app/build/outputs/apk/debug/app-debug.apk
```

**نیازمندی‌ها:** Node 20+, JDK 21, Android SDK 35

## ⚙️ CI/CD

هربار push به `main` باعث اجرای [GitHub Actions](../../actions) می‌شود:

1. `npm ci` → `npm run build` (Vite)
2. `npx cap sync android`
3. `./gradlew assembleDebug` (JDK 21)
4. آپلود APK به صورت Artifact با نام `ninja-arashi-2-debug-apk`

Artifact ها ۹۰ روز قابل دانلود هستند.

## 📲 نصب | Install

1. فایل APK را دانلود کنید
2. اگر پیام «منابع ناشناس» آمد: **Settings → Apps → Special access → Install unknown apps** را برای مرورگر/فایل‌منیجر خود فعال کنید
3. نصب و بازی کنید! (اندروید ۶ به بالا)

## 📄 License

Game code: MIT — art assets: project-internal. An original implementation — not affiliated with any existing game or brand.

---

## 📞 تماس با سازنده | Contact

**matin-code** — طراح سایت و توسعه‌دهنده وب | Web Designer & Developer

[![Telegram](https://img.shields.io/badge/Telegram-@matin3620-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/matin3620)
[![Instagram](https://img.shields.io/badge/Instagram-@matin__web__site-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://instagram.com/matin_web_site)
[![Phone](https://img.shields.io/badge/Phone-09195394891-25D366?style=flat-square&logo=phone&logoColor=white)](tel:09195394891)
[![Website](https://img.shields.io/badge/Website-matinzeus.ir-9146FF?style=flat-square&logo=googlechrome&logoColor=white)](https://matinzeus.ir)
[![Config Store](https://img.shields.io/badge/Config_Store-matin--wp--pro.ir-FF6D00?style=flat-square)](https://matin-wp-pro.ir)
