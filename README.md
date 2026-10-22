<div align="center">

# 🥷 Ninja Arashi 2: Shadow's Path

**نینجا آراشی ۲: مسیر سایه‌ها**

An intense dark-silhouette ninja action platformer — packaged as a native Android APK.

</div>

<div align="center">

![Platform](https://img.shields.io/badge/platform-Android%206%2B-green)
![Engine](https://img.shields.io/badge/render-Canvas%202D%20%2B%20React%2019-red)
![Wrapper](https://img.shields.io/badge/wrapper-Capacitor%207-blue)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-orange)
![Size](https://img.shields.io/badge/APK-~21%20MB-yellow)

</div>

---

<div align="center">

## ⬇️ دانلود | Download

**📱 [دانلود APK — Ninja-Arashi-2-v1.0.0.apk (~21 MB)](../../releases/download/v1.0.0/Ninja-Arashi-2-v1.0.0.apk)**

**🌐 [بازی آنلاین در مرورگر (بدون نصب)](https://matin-mohebi.github.io/ninja-arashi-2-apk/)** | [Releases](../../releases)

</div>

---

## 📖 درباره بازی | About

**فارسی:**
نبرد شینوبی در دنیای تاریکی و شمشیر! یک پلتفرمر اکشن با سبک ظاهری «سایه‌ها» (dark silhouette) الهام‌گرفته از Ninja Arashi 2، شامل مبارزه با کاتانا، پرتاب شوریکن، دَش سایه، جادوی مبدل (Kawarimi)، تله‌های مرگبار و باس‌فایت. بازی کاملاً **آفلاین** است و رابط کاربری فارسی/انگلیسی دارد.

**English:**
A side-scrolling action platformer featuring katana combat, shuriken throws, phantom dash, disguise ninjutsu, deadly traps, and boss battles across 3 levels with a persistent upgrade system (Dojo). 100% offline — no network permission required at runtime beyond the WebView engine.

## ✨ ویژگی‌ها | Features

- ⚔️ **Combat:** katana slash combos, shurikens with recharge, phantom dash (i-frames), disguise ninjutsu
- 🏯 **3 handcrafted levels** + boss fight, checkpoints, secret scrolls (3 per level), coins & diamonds
- 🛡️ **Dojo upgrade system** (health, katana, shuriken, dash, disguise) persisted via `localStorage`
- 🌐 **Bilingual UI:** Persian (default) / English, RTL-aware
- 🎵 **Procedural audio:** all SFX/music synthesized with Web Audio API — zero audio files
- 🌸 Parallax bamboo forest, sakura petals, dynamic lighting, camera shake & juice

## 📱 بهینه‌سازی موبایل | Mobile Optimizations

| مورد | توضیح |
|---|---|
| 🖼️ HiDPI Rendering | Canvas backing store × `min(devicePixelRatio, 2)` — تصویر شارپ روی صفحات رتینا |
| 🔒 Orientation | قفل `sensorLandscape` — فقط حالت افقی (با پشتیبانی چرخش ۱۸۰°) |
| 🖥️ Immersive Mode | نوار وضعیت/ناوبری مخفی، فقط با کشیدن از لبه ظاهر می‌شوند |
| 🔤 Offline Fonts | وزیرمتن + Cinzel + Jakarta داخل APK (woff2، بدون CDN) |
| ⬅️ Back Button | حین بازی = توقف (Pause)؛ دو بار = خروج با پیام تأیید |
| 🔋 Keep Screen On | صفحه حین بازی خاموش نمی‌شود |
| ✂️ Notch Safe-Area | HUD و دکمه‌ها با `env(safe-area-inset-*)` از ناچ فاصله می‌گیرند |
| 🙅 Touch Chrome | منوی لمس طولانی، انتخاب متن و زوم دوبل‌تپ غیرفعال شده |
| 🔄 Rotate Hint | در وب، اگر گوشی عمودی باشد راهنمای «گوشی را بچرخانید» نشان داده می‌شود |

## 🏗️ ساختار پروژه | Project Structure

```
├── src/
│   ├── engine/NinjaEngine.ts    # موتور بازی (۱۷۰۰+ خط): فیزیک، دوربین، رندر
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

Game code: MIT — art assets: project-internal. "Ninja Arashi" is a trademark of its respective owner; this is a fan-inspired original implementation.
