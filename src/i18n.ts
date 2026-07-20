import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "appTitle": "Our Map",
      "pairingCode": "Pairing Code",
      "pair": "Pair",
      "ghostMode": "Ghost Mode",
      "lastSeen": "Last seen",
      "battery": "Battery",
      "waitingForPartner": "Waiting for partner...",
      "yourLocation": "Your Location",
      "partnerLocation": "Partner's Location",
      "enterCodeToPair": "Enter a secret code to pair with your partner",
      "online": "Online",
      "offline": "Offline",
      "updateAvailable": "A new version is available",
      "updateNow": "Update Now",
      "unpair": "Unpair",
      "ghostModeActive": "Ghost mode active (location paused)",
      "copyCode": "Copy Code",
      "copied": "Copied!",
      "enableBackground": "Keep Alive in Background",
      "backgroundActive": "Background Tracking Active",
      "backgroundHelp": "This attempts to keep tracking active even when the screen is off (uses silent audio & wake lock).",
      "shareCodeWithPartner": "Share your code with your partner:",
      "showPairingSection": "Show pairing section",
      "hidePairingSection": "Hide pairing section",
      "displayName": "Your Display Name",
      "updateName": "Update Name",
      "nameUpdated": "Name updated!",
      "time": "Time",
      "backgroundInstructionsTitle": "Background Tracking Limitations",
      "backgroundInstructionsStep1": "1. Web App Limits: Because this is a web app (PWA), iOS and Android will automatically pause location tracking when you switch apps or go to the home screen to save battery.",
      "backgroundInstructionsStep2": "2. Best Method: To track continuously, you must keep the app OPEN on your screen.",
      "backgroundInstructionsStep3": "3. Screen Lock: We have enabled 'Screen Wake Lock' to prevent your screen from turning off while this is active.",
      "backgroundInstructionsStep4": "4. Battery Tip: Dim your screen brightness to save battery while leaving the app open in your pocket.",
      "locationPermissionDenied": "Location Permission Needed",
      "locationPermissionInstructions": "To track your location, you must allow location access. If denied, follow these steps to enable it:",
      "locationPermissionStep1": "1. Tap the Lock (🔒) or Site Settings icon in your browser's address bar.",
      "locationPermissionStep2": "2. Select 'Permissions' or 'Location'.",
      "locationPermissionStep3": "3. Change the location permission to 'Allow'.",
      "locationPermissionStep4": "4. Reload this page.",
      "close": "Close"
    }
  },
  th: {
    translation: {
      "appTitle": "แผนที่ของเรา",
      "pairingCode": "รหัสจับคู่",
      "pair": "จับคู่",
      "ghostMode": "โหมดซ่อนตัว",
      "lastSeen": "เห็นล่าสุด",
      "battery": "แบตเตอรี่",
      "waitingForPartner": "กำลังรอคู่ของคุณ...",
      "yourLocation": "ตำแหน่งของคุณ",
      "partnerLocation": "ตำแหน่งของคู่คุณ",
      "enterCodeToPair": "ใส่รหัสลับเพื่อจับคู่",
      "online": "ออนไลน์",
      "offline": "ออฟไลน์",
      "updateAvailable": "มีเวอร์ชันใหม่พร้อมใช้งาน",
      "updateNow": "อัปเดตตอนนี้",
      "unpair": "เลิกจับคู่",
      "ghostModeActive": "โหมดซ่อนตัวเปิดใช้งานอยู่ (หยุดแชร์ตำแหน่ง)",
      "copyCode": "คัดลอกรหัส",
      "copied": "คัดลอกแล้ว!",
      "enableBackground": "ทำงานเบื้องหลัง",
      "backgroundActive": "กำลังติดตามเบื้องหลัง",
      "backgroundHelp": "พยายามทำงานแม้ปิดหน้าจอ (ใช้เสียงเงียบและการล็อคหน้าจอ)",
      "shareCodeWithPartner": "แชร์รหัสของคุณกับคู่ของคุณ:",
      "showPairingSection": "แสดงส่วนจับคู่",
      "hidePairingSection": "ซ่อนส่วนจับคู่",
      "displayName": "ชื่อแสดงของคุณ",
      "updateName": "อัปเดตชื่อ",
      "nameUpdated": "อัปเดตชื่อแล้ว!",
      "time": "เวลา",
      "backgroundInstructionsTitle": "ข้อจำกัดการทำงานเบื้องหลัง",
      "backgroundInstructionsStep1": "1. ข้อจำกัดของเว็บแอป: เนื่องจากเป็นเว็บแอป (PWA) ระบบ iOS และ Android จะหยุดการติดตามตำแหน่งชั่วคราวเมื่อคุณสลับแอปหรือไปที่หน้าจอหลักเพื่อประหยัดแบตเตอรี่",
      "backgroundInstructionsStep2": "2. วิธีที่ดีที่สุด: หากต้องการติดตามอย่างต่อเนื่อง คุณต้องเปิดแอปทิ้งไว้บนหน้าจอ",
      "backgroundInstructionsStep3": "3. การล็อกหน้าจอ: เราได้เปิดใช้งาน 'Screen Wake Lock' เพื่อไม่ให้หน้าจอดับขณะใช้งาน",
      "backgroundInstructionsStep4": "4. เคล็ดลับประหยัดแบต: หรี่ความสว่างหน้าจอลงเพื่อประหยัดแบตเตอรี่ขณะเปิดแอปทิ้งไว้ในกระเป๋า",
      "locationPermissionDenied": "จำเป็นต้องใช้สิทธิ์ตำแหน่ง",
      "locationPermissionInstructions": "เพื่อติดตามตำแหน่งของคุณ คุณต้องอนุญาตการเข้าถึงตำแหน่ง หากถูกปฏิเสธ ให้ทำตามขั้นตอนเหล่านี้:",
      "locationPermissionStep1": "1. แตะไอคอนแม่กุญแจ (🔒) หรือการตั้งค่าเว็บไซต์ในแถบที่อยู่เบราว์เซอร์ของคุณ",
      "locationPermissionStep2": "2. เลือก 'สิทธิ์' หรือ 'ตำแหน่ง'",
      "locationPermissionStep3": "3. เปลี่ยนสิทธิ์ตำแหน่งเป็น 'อนุญาต'",
      "locationPermissionStep4": "4. โหลดหน้านี้ใหม่",
      "close": "ปิด"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
