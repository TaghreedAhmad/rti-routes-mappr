# Route Optimizer

رفعت لك مشروع Kinza VRP Engine جاهز (ملف ZIP كامل + ملفين إضافيين 

data.ts و RouteReviewMap.jsx.txt للمرجع).

المطلوب:

1. فك ضغط الملف واستخدم بنية المشروع بداخله كما هي، مع كل الملفات:

   components/route-review.tsx, components/route-map.tsx, lib/data.ts, 

   lib/i18n.ts, lib/utils.ts, app/globals.css وكل الملفات المساندة

2. لا تعيد كتابة منطق route-map.tsx أو بيانات lib/data.ts من الصفر — 

   هذي بيانات حقيقية محسوبة من ملف إكسل فعلي (شاحنات وعملاء حقيقيين) 

   والكود يستخدم Google Maps JavaScript API + Directions API فعليًا

3. عدّل فقط ما يلزم للتوافق التقني مع بيئة Vite/React الخاصة بك 

   (مثل تحويل متغيرات البيئة من صيغة Next.js إلى صيغة Vite إن لزم)، 

   دون تغيير أي منطق أو بيانات

4. حافظ على: التصميم (أبيض وأخضر لوجستي #2E8B57)، دعم RTL الكامل، 

   تبديل اللغة عربي/إنجليزي، والوضع الداكن/الفاتح

بعد البناء، أخبرني أين أضع مفتاح NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 

بإعدادات البيئة الخاصة بمنصتكم.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rti-routes-mappr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/95e6bdc1-9dea-457e-aa92-c3b90e8693d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
