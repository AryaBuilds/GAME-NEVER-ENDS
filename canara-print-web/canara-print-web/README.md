# Canara Print — Browser Version
**Developed By Aryaman Digital Studio**

Customer duniya me kahin se bhi QR scan karke file upload kare → file apne aap crop + enhance + PDF → aapke **Chrome ke dashboard** me order dikhe → **Print** dabao.
Laptop par **kuch install nahi karna**. Bas Chrome me ek website kholni hai.

## Kaise kaam karta hai
- **Customer page**: `https://aapka-link/` (QR isi par le jata hai) — koi login nahi.
- **Aapka dashboard**: `https://aapka-link/owner` — aapke **PIN** se khulta hai.
- Server internet par free chalta hai, to laptop band ho tab bhi customer file bhej sakta hai; dashboard khulte hi order dikh jata hai.
- **QR hamesha wahi rehta hai** (link kabhi nahi badalta, domain kharidne ki zaroorat nahi).

> PIN kyun: dashboard internet par hota hai, aur customers ki files wahan aati hain. PIN ke bina koi bhi dekh sakta tha. PIN sirf ek baar server me daalna hai, aur Chrome use yaad rakhta hai (30 din).

---

## Free me online karna (ek baar, ~15 minute) — Render.com

Aapko GitHub aur Render ka free account chahiye (dono me card nahi maanga jata — Render ka sign-up screen par jo likha ho wahi dekhiye).

**A) Code GitHub par daalo (sirf website se, kuch install nahi)**
1. https://github.com par free account banao → **New repository** → naam `canara-print` → **Private** chuno → Create.
2. Naye repository me **uploading an existing file** par click karo.
3. Is zip ke andar ki **saari files/folders** (`server.js`, `package.json`, `public` folder, `README.md`) drag karke chhod do → **Commit changes**.
   - `public` folder ke andar `vendor` folder bhi jana chahiye (bahut badi files hain, upload hone me thoda time lagega).

**B) Render par chalao**
1. https://render.com par **GitHub se Sign up** karo.
2. **New +** → **Web Service** → apna `canara-print` repository chuno (GitHub access dene ko bole to allow karo).
3. Ye bharo:
   - **Language/Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. **Environment Variables** me ye jodo:
   - `OWNER_PIN` = aapka PIN (kam se kam 6 number/letters, jaise `482915`) — **zaroor**
   - `SHOP_NAME` = Canara Print
   - `NODE_VERSION` = 22
5. **Create Web Service** → 3-5 minute me build hoga → upar aapka link dikhega, jaise `https://canara-print-xxxx.onrender.com`.

**C) Use karna**
1. Chrome me `https://aapka-link/owner` kholo → PIN daalo.
2. **Print Your QR** dabao → naya tab khulega → usse print karke dukaan par laga do. **Ye QR ab hamesha chalega.**
3. Customer QR scan karega, file bhejega, aur aapke dashboard me order aa jayega (naye order par awaaz bhi aati hai).
4. **Print** dabao → print window khulegi → print → **"Print ho gaya"** dabao (customer ke phone par bhi "Print ho gaya" dikh jata hai).

---

## Seedha print (bina print window ke)
Chrome ka ek shortcut banao (Desktop → right-click → New → Shortcut) aur ye likho (apna link daalo):

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing https://aapka-link/owner
```
Is shortcut se kholne par **Print** dabate hi file seedha **Windows ke default printer** par chali jati hai, koi window nahi aati. Dashboard ke **Print Settings** me "Print bhejte hi order complete mark kar do" bhi chalu kar sakte ho.

## Free server ki sacchai (dhyan se padho)
- **Server 15 minute koi na aaye to so jata hai.** Pehle customer ko 1 minute lag sakta hai (page par likha aata hai). Isse bachne ke liye https://uptimerobot.com par free account banao → **Add monitor** → HTTP(s) → URL `https://aapka-link/health` → har 5 minute. Phir server jaagta rahega. Render har mahine 750 free ghante deta hai, ek server 24 ghante chalane ke liye kaafi hai.
- **Orders server ki memory me rehte hain.** Server restart/so jaye to jo order abhi print nahi hue wo ud jate hain (customer ko dobara bhejna padega). Print hote hi file waise bhi delete ho jati hai (privacy).
- Browser se **B/W aur Color printer alag-alag apne aap nahi chun sakta** — jo printer Windows me default ho ya print window me chuno. **Double side** bhi print window me chunna hota hai (order par likha dikhta hai).
- **Auto crop** plain border/table hata deta hai aur contrast/sharpness theek karta hai. Tedhi photo ko seedha (CamScanner jaisa) nahi karta; customer ✂ se haath se crop kar sakta hai.
- Limit: ek baar me 15 file, har file 25 MB tak, kul 80 MB.
- Payment nahi hai — paisa counter par lein.

## Agar Render nahi chala to
Dusra free tareeka bhi hai (laptop par hi chalana), par usme laptop me Node.js aur ek chhota tool lagana padta hai aur QR badalta rehta hai (ya domain kharidna padta hai). Pehle ye browser wala try kar lo.
