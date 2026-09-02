# KIM ADDONS

منصة KIM ADDONS لرفع وتنزيل إضافات Minecraft Bedrock وJava.

## التشغيل

1. انسخ `.env.example` إلى `.env`.
2. ضع `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY`.
3. افتح `supabase/schema.sql` داخل Supabase SQL Editor وشغّله.
4. أنشئ Storage buckets باسم `addons` و`addon-images` واجعلهما Public.
5. أضف سياسات Storage تسمح للمستخدمين المسجلين بالرفع إلى مسارهم.
6. نفّذ:

```bash
npm install
npm run dev
```

ثم لبناء نسخة الإنتاج:

```bash
npm run build
```

> ملاحظة: هذا مستودع مشروع فعلي، لكنه لا يحتوي مفاتيح Supabase السرية. لا تضع `service_role` داخل تطبيق الواجهة.
