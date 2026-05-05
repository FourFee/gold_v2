// 📦 idcard-reader/read-idcard.js
const { Devices } = require('smartcard');
const iconv = require('iconv-lite');
const axios = require('axios');

const API_BASE = 'http://178.128.80.147/api';
const READ_DELAY_MS = 150;       // หน่วงรอบัตรพร้อมหลังเสียบ
const MAX_RETRIES   = 3;         // จำนวนครั้งที่ retry APDU command
const RETRY_DELAY   = 120;       // หน่วงระหว่าง retry

const api = axios.create({ baseURL: API_BASE, timeout: 5000 });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const clean = (text) =>
  text
    .replace(/\0/g, '')          // ล้างตัว \x00 (Null character)
    .replace(/ /g, '')           // ลบช่องว่าง (ถ้าต้องการตาม logic เดิมของคุณ)
    .replace(/\uFFFD/g, '')     // ลบตัวอักษรที่อ่านไม่ออก
    .replace(/#+/g, ' ')         // เปลี่ยน # เป็นช่องว่าง
    .replace(/\x00/g, '')        // ล้างตัว \x00 (Null character)
    .replace(/\s{2,}/g, ' ')     // ยุบช่องว่างที่ซ้อนกัน
    .trim();

const cleanName = (fullName) => {
  const prefixes = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'น.ส.'];
  for (const prefix of prefixes) {
    if (fullName.startsWith(prefix)) return fullName.replace(prefix, '').trim();
  }
  return fullName.trim();
};

const decodeText = (buffer) => iconv.decode(buffer, 'tis-620');

const hex = (b) => b.toString(16).padStart(2, '0');

// ส่ง APDU พร้อมจัดการ status word — รองรับทั้ง 0x61xx (GET RESPONSE) และ 0x6Cxx (wrong Le)
const sendAPDU = async (card, command, label) => {
  let resp = await card.issueCommand(Buffer.from(command));

  // 0x6Cxx — Le ผิด ใช้ค่าที่บัตรบอกแล้วยิงใหม่
  if (resp.length === 2 && resp[0] === 0x6c) {
    const fixed = [...command];
    fixed[fixed.length - 1] = resp[1];
    resp = await card.issueCommand(Buffer.from(fixed));
  }

  // 0x61xx — ข้อมูลพร้อม ขอด้วย GET RESPONSE
  if (resp.length === 2 && resp[0] === 0x61) {
    resp = await card.issueCommand(Buffer.from([0x00, 0xc0, 0x00, 0x00, resp[1]]));
  }

  // ตรวจ status word ที่ท้าย response (2 ไบต์สุดท้าย)
  if (resp.length >= 2) {
    const sw1 = resp[resp.length - 2];
    const sw2 = resp[resp.length - 1];
    if (sw1 !== 0x90 || sw2 !== 0x00) {
      // ไม่ใช่ success — log ไว้แต่ยังคืน resp เพื่อให้ caller ตัดสินใจ
      if (label) console.warn(`⚠️ ${label} SW=${hex(sw1)}${hex(sw2)} (ไม่ใช่ 9000)`);
    }
  }
  return resp;
};

// retry wrapper สำหรับ APDU command — ลองใหม่ถ้าล้มเหลว
const withRetry = async (fn, label) => {
  let lastErr;
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ ${label} ครั้งที่ ${i}/${MAX_RETRIES} ล้มเหลว: ${err.message}`);
      if (i < MAX_RETRIES) await sleep(RETRY_DELAY);
    }
  }
  throw new Error(`${label} ล้มเหลวครบ ${MAX_RETRIES} ครั้ง: ${lastErr?.message}`);
};

// ── กัน process crash ──────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});

// ── Devices ────────────────────────────────────────────────────────────────
const devices = new Devices();

devices.on('error', (err) => {
  console.error('❌ Devices error:', err.message || err);
});

devices.on('device-activated', (event) => {
  const device = event.device;
  console.log(`📲 เชื่อมต่อกับ: ${device.name}`);

  // ลบ listener เก่าออกก่อน (ป้องกัน duplicate เมื่อถอด-เสียบซ้ำ)
  device.removeAllListeners('card-inserted');
  device.removeAllListeners('card-removed');
  device.removeAllListeners('error');

  device.on('error', (err) => {
    console.error('❌ Device error:', err.message || err);
  });

  let lastCitizenID = null;
  let reading = false;  // กัน race condition: ห้ามอ่านซ้อน

  device.on('card-inserted', async (event) => {
    if (reading) {
      console.log('⏳ กำลังอ่านอยู่ ข้าม event นี้');
      return;
    }
    reading = true;
    const card = event.card;
    console.log('📇 ใส่บัตรแล้ว — รอบัตรพร้อม...');

    try {
      // หน่วงสั้นๆ รอให้บัตร/reader พร้อมก่อนยิง APDU
      await sleep(READ_DELAY_MS);

      // 1. SELECT DF (ระบุ application Thai ID Card)
      await withRetry(
        () => card.issueCommand(
          Buffer.from([0x00, 0xa4, 0x04, 0x00, 0x08, 0xa0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01])
        ),
        'SELECT DF'
      );

      // 2. Read CID
      const cidResp = await withRetry(
        () => sendAPDU(card, [0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d], 'Read CID'),
        'Read CID'
      );
      const cid = clean(decodeText(cidResp));

      if (!cid || cid.length < 13) {
        console.warn(`⚠️ CID ดูไม่ถูกต้อง: "${cid}" — ข้าม`);
        return;
      }

      if (cid === lastCitizenID) {
        console.log('⚠️ บัตรนี้เคยอ่านแล้ว ข้าม...');
        return;
      }

      // 3. Read TH Name
      const nameResp = await withRetry(
        () => sendAPDU(card, [0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64], 'Read Name'),
        'Read Name'
      );
      const nameTH = cleanName(clean(decodeText(nameResp)));

      // 4. Read Address
      const addrResp = await withRetry(
        () => sendAPDU(card, [0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64], 'Read Address'),
        'Read Address'
      );
      const address = clean(decodeText(addrResp));

      const idcardData = { citizen_id: cid, name_th: nameTH, address };
      console.log('\n📦 ข้อมูลทั้งหมด:', idcardData);

      // ตั้ง lastCitizenID หลัง POST สำเร็จเท่านั้น
      await api.post('/idcard', idcardData);
      lastCitizenID = cid;
      console.log('🚀 ส่งข้อมูลไป VPS สำเร็จ!');

    } catch (err) {
      // ไม่ตั้ง lastCitizenID เพื่อให้อ่านซ้ำได้ถ้าเกิด error
      if (err.response) {
        console.error('❌ Server error:', err.response.status, err.response.data);
      } else if (err.request) {
        console.error('❌ No response (network):', err.message);
      } else {
        console.error('❌ ผิดพลาด:', err.message);
      }
    } finally {
      reading = false;
    }
  });

  device.on('card-removed', async () => {
    console.log('📤 บัตรถูกถอด');
    lastCitizenID = null;
    reading = false;
    try {
      await api.post('/idcard/clear');
      console.log('🧹 ล้างข้อมูลใน frontend เรียบร้อย');
    } catch (err) {
      console.error('❌ แจ้งล้างข้อมูลไม่สำเร็จ:', err.message);
    }
  });
});

devices.on('device-deactivated', (event) => {
  console.log(`🔌 ถอดเครื่องอ่านบัตร: ${event.device?.name || 'unknown'}`);
});

console.log('🟢 ID Card Reader พร้อมทำงาน — รอเสียบบัตร...');
