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
      "time": "Time"
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
      "time": "เวลา"
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
