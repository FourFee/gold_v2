import dayjs from 'dayjs';

const TH_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                         'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// Debug: เปิด ?debug=1 ใน URL เพื่อดู console log ของ search
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

/**
 * แปลงวันที่เป็น String หลากหลายรูปแบบ (Haystack)
 */
export function dateHaystack(date?: string | null): string {
  if (!date) return '';
  let d = dayjs(date);
  if (!d.isValid()) {
    const nd = new Date(date);
    if (!isNaN(nd.getTime())) d = dayjs(nd);
  }
  if (!d.isValid()) return '';
  
  const day = d.date();
  const month = d.month();
  const yearCE = d.year();
  const yearBE = yearCE + 543;
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  const m1 = month + 1;
  const monthName = TH_MONTHS_FULL[month];
  const monthShort = TH_MONTHS_SHORT[month];

  return [
    `${day}/${m1}/${yearBE}`, `${dd}/${mm}/${yearBE}`,
    `${day}/${m1}/${yearCE}`, `${dd}/${mm}/${yearCE}`,
    `${day}/${m1}/${yearBE % 100}`, `${dd}/${mm}/${String(yearBE % 100).padStart(2,'0')}`,
    `${day}/${m1}/${yearCE % 100}`, `${dd}/${mm}/${String(yearCE % 100).padStart(2,'0')}`,
    `${day}/${m1}`, `${dd}/${mm}`,
    `${day} ${monthName}`, `${day} ${monthShort}`,
    `${day} ${monthName} ${yearBE}`,
    `${monthName}`, `${monthShort}`,
    `${monthName} ${yearBE}`,
    `${yearBE}`, `${yearCE}`,
    d.format('YYYY-MM-DD'),
  ].join(' ');
}

export function buildSearchFilter(search: string): (haystack: string) => boolean {
  const cleanSearch = typeof search === 'string' ? search : String(search ?? '');
  const terms = cleanSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (DEBUG && terms.length > 0) {
    console.log('[search] terms:', terms);
  }

  if (terms.length === 0) return () => true;

  return (haystack: string) => {
    if (!haystack) return false;
    const hay = haystack.toLowerCase();
    return terms.every(t => hay.includes(t));
  };
}