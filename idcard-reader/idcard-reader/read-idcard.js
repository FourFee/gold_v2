// 📦 idcard-reader/read-idcard.js
const { Devices } = require('smartcard');
const iconv = require('iconv-lite');
const axios = require('axios');

const devices = new Devices();

const clean = (text) =>
  text.replace(/\u0000/g, '').replace(/�/g, '').replace(/#+/g, ' ').replace(/\s{2,}/g, ' ').trim();

const cleanName = (fullName) => {
  const prefixes = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
  for (const prefix of prefixes) {
    if (fullName.startsWith(prefix)) {
      return fullName.replace(prefix, '').trim();
    }
  }
  return fullName.trim();
};

const decodeText = (buffer) => iconv.decode(buffer, 'tis-620');

const GET_RESPONSE = async (card, resp) => {
  if (resp.length === 2 && resp[0] === 0x61) {
    const len = resp[1];
    const getResp = await card.issueCommand(Buffer.from([0x00, 0xc0, 0x00, 0x00, len]));
    return getResp;
  }
  return resp;
};

let lastCitizenID = null;

devices.on('device-activated', (event) => {
  const device = event.device;
  console.log(`📲 เชื่อมต่อกับ: ${device.name}`);

  device.on('card-inserted', async (event) => {
    const card = event.card;
    console.log('📇 ใส่บัตรแล้ว');

    try {
      // 1. SELECT DF
      let resp = await card.issueCommand(
        Buffer.from([0x00, 0xa4, 0x04, 0x00, 0x08, 0xa0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01])
      );

      // 2. Read CID
      resp = await card.issueCommand(Buffer.from([0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d]));
      const cid = clean(decodeText(await GET_RESPONSE(card, resp)));

      if (cid === lastCitizenID) {
        console.log('⚠️ บัตรนี้เคยอ่านแล้ว ข้าม...');
        return;
      }

      lastCitizenID = cid;

      // 3. Read TH Name
      resp = await card.issueCommand(Buffer.from([0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64]));
      const rawName = clean(decodeText(await GET_RESPONSE(card, resp)));
      const nameTH = cleanName(rawName);

      // 4. Read Address
      resp = await card.issueCommand(Buffer.from([0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64]));
      const address = clean(decodeText(await GET_RESPONSE(card, resp)));

      const idcardData = {
        citizen_id: cid,
        name_th: nameTH,
        address: address,
      };

      console.log('\n📦 ข้อมูลทั้งหมด:', idcardData);

      const axiosInstance = axios.create({
        baseURL: 'http://178.128.80.147/api',
        timeout: 5000,
      });

      const response = await axiosInstance.post('/idcard', idcardData);
      console.log('🚀 ส่งข้อมูลไป VPS สำเร็จ!', response.data);
    } catch (err) {
      if (err.response) {
        console.error('❌ Server response error:', err.response.status, err.response.data);
      } else if (err.request) {
        console.error('❌ No response received:', err.request);
      } else {
        console.error('❌ ผิดพลาด:', err.message);
      }
    }
  });

  device.on('card-removed', async () => {
  console.log('📤 บัตรถูกถอด');
  lastCitizenID = null;

  // 🔔 แจ้ง backend หรือ frontend ให้ล้างข้อมูล
  try {
    const axiosInstance = axios.create({
      baseURL: 'http://178.128.80.147/api',
      timeout: 3000,
    });

    await axiosInstance.post('/idcard/clear'); // 👈 endpoint นี้จะ trigger frontend เคลียร์ข้อมูล
    console.log('🧹 ล้างข้อมูลใน frontend เรียบร้อย');
  } catch (err) {
    console.error('❌ แจ้งล้างข้อมูลไม่สำเร็จ:', err.message);
  }
});
});
