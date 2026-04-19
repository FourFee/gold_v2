// path: src/pages/Dashboard.tsx

import { useEffect, useState, useMemo } from "react";
import {
  Box, Grid, Paper, Typography, Card, CardContent,
  ToggleButton, ToggleButtonGroup, CircularProgress,
  alpha, Fade, Grow, Stack, LinearProgress, Chip,
  TextField, InputAdornment, MenuItem, Select,
  FormControl, InputLabel
} from "@mui/material";

import { BarChart, LineChart } from '@mui/x-charts';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaidIcon from '@mui/icons-material/Paid';
import InventoryIcon from '@mui/icons-material/Inventory';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TimelineIcon from '@mui/icons-material/Timeline';
import MultilineChartIcon from '@mui/icons-material/MultilineChart';
import ScaleIcon from '@mui/icons-material/Scale';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';

import 'dayjs/locale/th';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { API_BASE, GOLD_BAHT_TO_GRAM_BAR, GOLD_BAHT_TO_GRAM_ORNAMENT } from "../config";

dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.locale('th');

type Period = "day" | "week" | "month";

interface SummaryData {
  sellOut: number;
  exchange: number;
  buyIn: number;
  bar_buy: number;
  bar_sell: number;
  plated_gold: number;
  total_gold_flow: number;
  redeem: number;
  interest: number;
  pawn: number;
  total_pawn_flow: number;
  expenses: number;
  gold_out: number;
  diamondBuyIn: number;
  diamondSellOut: number;
  // ✅ เพิ่ม: ข้อมูลราคาทองแท่ง
  bar_buy_amount: number;
  bar_sell_amount: number;
  avg_bar_buy_price_per_baht: number;
  avg_bar_sell_price_per_baht: number;
  avg_bar_buy_price_per_gram: number;
  avg_bar_sell_price_per_gram: number;
  bar_profit: number;
}

interface AllTransactionsGraphData {
  [key: string]: string | number;
  label: string;
  date: string;
  redeem: number;
  interest: number;
  pawn: number;
  buyIn: number;
  exchange: number;
  sellOut: number;
  expenses: number;
  diamondBuyIn: number;
  diamondSellOut: number;
  platedGold: number;
  total_gold_flow: number;
  bar_buy: number;
  bar_sell: number;
  total_pawn_flow: number;
}

const API = `${API_BASE}/dashboard`;

// สีที่ใช้ใน Dashboard
const COLOR_SCHEME = {
  primary: '#D4AF37', // ทอง
  secondary: '#B8860B',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  purple: '#9C27B0',
  cyan: '#00BCD4',
  orange: '#FF5722',
  teal: '#009688',
  pink: '#E91E63',
  lime: '#CDDC39',
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666'
};

// แพทเทิร์น SVG สำหรับพื้นหลังการ์ด
const goldPattern = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4AF37' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`;

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [isLoading, setIsLoading] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  // สถานะสำหรับเลือกเดือน/ปี แยกต่างหาก
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [allTransactionsGraphData, setAllTransactionsGraphData] = useState<AllTransactionsGraphData[]>([]);
  const [barGoldStock, setBarGoldStock] = useState<{ remaining_baht: number, remaining_grams: number } | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  // สร้างรายการเดือนและปี
  const months = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' },
  ];

  // สร้างรายการปี (3 ปีย้อนหลัง + ปัจจุบัน)
  const currentYear = dayjs().year();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  // คำนวณข้อมูลสรุป
  const calculatedSummary = useMemo(() => {
    if (!summary) return null;

    const totalRevenue = (summary.redeem || 0) + 
                        (summary.interest || 0) + 
                        (summary.sellOut || 0) + 
                        (summary.bar_sell || 0) + 
                        (summary.diamondSellOut || 0);
    
    const totalCost = (summary.pawn || 0) + 
                     (summary.buyIn || 0) + 
                     (summary.bar_buy || 0) + 
                     (summary.expenses || 0) + 
                     (summary.diamondBuyIn || 0);
    
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      goldInStock: (summary.buyIn || 0) + (summary.bar_buy || 0),
      goldOutStock: (summary.sellOut || 0) + (summary.bar_sell || 0),
      goldNetFlow: ((summary.buyIn || 0) + (summary.bar_buy || 0)) - ((summary.sellOut || 0) + (summary.bar_sell || 0)),
      pawnProfit: (summary.redeem || 0) - (summary.pawn || 0) + (summary.interest || 0),
      expensesPercentage: totalRevenue > 0 ? ((summary.expenses || 0) / totalRevenue) * 100 : 0
    };
  }, [summary]);

useEffect(() => {
  async function fetchData() {
    setIsLoading(true);
    try {
      const today = dayjs();

      // ========== 1. PARAMS สำหรับ SUMMARY (แสดงเฉพาะช่วงที่เลือก) ==========
      const summaryParams = new URLSearchParams({
        period: period,
      });

      let summaryStartDate, summaryEndDate;

      if (period === "day") {
        const targetDate = selectedDate || today;
        summaryStartDate = targetDate.format('YYYY-MM-DD');
        summaryEndDate = targetDate.format('YYYY-MM-DD');
        summaryParams.append('date_str', summaryStartDate);
      } 
      else if (period === "week") {
        const targetDate = selectedDate || today;
        
        // ✅ คำนวณวันเสาร์ล่าสุดที่ผ่านมา (ไม่ใช่วันเสาร์อนาคต)
        const daysSinceLastSaturday = targetDate.day(); // 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์
        const lastSaturday = targetDate.subtract(daysSinceLastSaturday, 'day');
        
        // ✅ วันที่เริ่มต้น: วันเสาร์ที่ผ่านมา
        summaryStartDate = lastSaturday.format('YYYY-MM-DD');
        // ✅ วันที่สิ้นสุด: วันที่เลือก (ปัจจุบัน)
        summaryEndDate = targetDate.format('YYYY-MM-DD');
        
        summaryParams.append('start_date', summaryStartDate);
        summaryParams.append('end_date', summaryEndDate);
        
        console.log('📊 SUMMARY - สัปดาห์ปัจจุบัน:', {
          startDate: summaryStartDate,
          endDate: summaryEndDate,
          week: targetDate.week(),
          lastSaturday: lastSaturday.format('DD/MM/YYYY'),
          today: targetDate.format('DD/MM/YYYY')
        });
      }
      else if (period === "month") {
        const year = selectedYear || today.year();
        const month = selectedMonth || today.month() + 1;
        const christianYear = year > 2500 ? year - 543 : year;
        
        // ✅ SUMMARY: เฉพาะเดือนที่เลือกเท่านั้น (1 เดือน)
        summaryStartDate = dayjs()
          .year(christianYear)
          .month(month - 1)
          .startOf('month')
          .format('YYYY-MM-DD');
        
        summaryEndDate = dayjs()
          .year(christianYear)
          .month(month - 1)
          .endOf('month')
          .format('YYYY-MM-DD');
        
        summaryParams.append('start_date', summaryStartDate);
        summaryParams.append('end_date', summaryEndDate);
        
        console.log('📊 SUMMARY - เฉพาะเดือนที่เลือก:', {
          startDate: summaryStartDate,
          endDate: summaryEndDate,
          month: month,
          year: christianYear
        });
      }

      // ========== 2. PARAMS สำหรับ GRAPH (แสดง 5 สัปดาห์/6 เดือนย้อนหลัง) ==========
      const graphParams = new URLSearchParams({
        period: period,
      });

      let graphStartDate, graphEndDate;

      if (period === "day") {
        const targetDate = selectedDate || today;
        graphStartDate = targetDate.format('YYYY-MM-DD');
        graphEndDate = targetDate.format('YYYY-MM-DD');
        graphParams.append('date_str', graphStartDate);
      } 
      else if (period === "week") {
        const targetDate = selectedDate || today;
        const weeksToFetch = 5;
        
        // ✅ คำนวณวันเสาร์ล่าสุดที่ผ่านมา
        const daysSinceLastSaturday = targetDate.day();
        const lastSaturday = targetDate.subtract(daysSinceLastSaturday, 'day');
        
        // ✅ วันที่สิ้นสุด: วันที่เลือก (ปัจจุบัน)
        graphEndDate = targetDate.format('YYYY-MM-DD');
        
        // ✅ วันที่เริ่มต้น: ย้อนกลับไป 5 สัปดาห์จากวันเสาร์ที่ผ่านมา
        graphStartDate = lastSaturday
          .subtract(weeksToFetch - 1, 'week')
          .format('YYYY-MM-DD');
        
        graphParams.append('start_date', graphStartDate);
        graphParams.append('end_date', graphEndDate);
        
        console.log('📈 GRAPH - 5 สัปดาห์ย้อนหลัง:', {
          startDate: graphStartDate,
          endDate: graphEndDate,
          lastSaturday: lastSaturday.format('DD/MM/YYYY'),
          today: targetDate.format('DD/MM/YYYY')
        });
      }
      else if (period === "month") {
        const year = selectedYear || today.year();
        const month = selectedMonth || today.month() + 1;
        const monthsToFetch = 6;
        const christianYear = year > 2500 ? year - 543 : year;
        
        // ✅ GRAPH: 6 เดือนย้อนหลัง
        graphEndDate = dayjs()
          .year(christianYear)
          .month(month - 1)
          .endOf('month')
          .format('YYYY-MM-DD');
        
        let startMonth = month - monthsToFetch;
        let startYear = christianYear;
        
        while (startMonth <= 0) {
          startMonth += 12;
          startYear -= 1;
        }
        
        graphStartDate = dayjs()
          .year(startYear)
          .month(startMonth - 1)
          .startOf('month')
          .format('YYYY-MM-DD');
        
        graphParams.append('start_date', graphStartDate);
        graphParams.append('end_date', graphEndDate);
        graphParams.append('group_by', 'month');
        
        console.log('📈 GRAPH - 6 เดือนย้อนหลัง:', {
          startDate: graphStartDate,
          endDate: graphEndDate
        });
      }

      // ========== 3. CALL APIs ==========
      const [summaryRes, allTransactionsGraphRes, barGoldStockRes] = await Promise.all([
        fetch(`${API}/summary?${summaryParams.toString()}`),
        fetch(`${API}/all-transactions-graph?${graphParams.toString()}`),
        fetch(`${API}/bar-gold-stock`)
      ]);

      if (!summaryRes.ok) throw new Error("Failed to fetch summary");
      if (!allTransactionsGraphRes.ok) throw new Error("Failed to fetch all transactions graph data");
      if (!barGoldStockRes.ok) throw new Error("Failed to fetch bar gold stock");

      const summaryData = await summaryRes.json();
      const allTransactionsData = await allTransactionsGraphRes.json();
      const barGoldStockData = await barGoldStockRes.json();

      console.log('✅ Data received:', {
        summaryPeriod: { 
          start: summaryStartDate, 
          end: summaryEndDate 
        },
        graphPeriod: { 
          start: graphStartDate, 
          end: graphEndDate,
          dataPoints: allTransactionsData.length 
        },
        summaryData: {
          buyIn: summaryData.buyIn,
          sellOut: summaryData.sellOut,
          bar_buy: summaryData.bar_buy,
          bar_sell: summaryData.bar_sell
        }
      });

      setSummary(summaryData);
      setAllTransactionsGraphData(allTransactionsData);
      setBarGoldStock(barGoldStockData);
      setAnimationKey(prev => prev + 1);

    } catch (error) {
      console.error("❌ โหลดข้อมูล Dashboard ไม่สำเร็จ:", error);
      alert("❌ โหลดข้อมูล Dashboard ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }
  fetchData();
}, [period, selectedDate, selectedMonth, selectedYear]);

  // เพิ่มฟังก์ชันนี้ใน component
  const getSummaryPeriodText = () => {
    if (period === "day") {
      return `วันที่ ${selectedDate?.format('DD/MM/YYYY') || dayjs().format('DD/MM/YYYY')}`;
    } 
    else if (period === "week") {
      const targetDate = selectedDate || dayjs();
      // ✅ คำนวณวันเสาร์ที่ผ่านมา
      const daysSinceLastSaturday = targetDate.day();
      const lastSaturday = targetDate.subtract(daysSinceLastSaturday, 'day');
      
      return `สัปดาห์ ${lastSaturday.format('DD/MM')} - ${targetDate.format('DD/MM/YYYY')}`;
    } 
    else if (period === "month") {
      const monthName = months.find(m => m.value === selectedMonth)?.label || '';
      return `เดือน ${monthName} ${selectedYear + 543}`;
    }
    return '';
  };

  const formatXAxisTick = (value: string) => {
    const dateObj = dayjs(value);
    if (period === 'day') {
      return dateObj.format('DD MMM');
    } else if (period === 'week') {
      const originalDataPoint = allTransactionsGraphData.find(item => item.date === value);
      if (originalDataPoint && originalDataPoint.label) {
        const parts = originalDataPoint.label.split(' - ');
        return parts.length > 0 ? parts[0] : originalDataPoint.label;
      }
      return dateObj.format('DD MMM');
    } else {
      return dateObj.format('MMM YYYY');
    }
  };

  // ประมวลผลข้อมูลสำหรับกราฟทอง (เพิ่มหน่วยบาทน้ำหนัก)
  const processedGoldChartData = useMemo(() => {
    return allTransactionsGraphData.map(item => ({
      ...item,
      // คำนวณหน่วยบาทน้ำหนักจากกรัม
      bar_buy_baht: ((item.bar_buy as number) || 0) / GOLD_BAHT_TO_GRAM_BAR,
      bar_sell_baht: ((item.bar_sell as number) || 0) / GOLD_BAHT_TO_GRAM_BAR,
    }));
  }, [allTransactionsGraphData]);

  // ประมวลผลข้อมูลสำหรับ Line Chart
  const processedLineChartData = useMemo(() => {
    return allTransactionsGraphData.map(item => ({
      ...item,
      total_revenue: (item.redeem || 0) + (item.interest || 0) + (item.sellOut || 0) + (item.bar_sell || 0) + (item.diamondSellOut || 0),
      total_cost: (item.pawn || 0) + (item.buyIn || 0) + (item.bar_buy || 0) + (item.expenses || 0) + (item.diamondBuyIn || 0),
      net_profit: ((item.redeem || 0) + (item.interest || 0) + (item.sellOut || 0) + (item.bar_sell || 0) + (item.diamondSellOut || 0)) - 
                  ((item.pawn || 0) + (item.buyIn || 0) + (item.bar_buy || 0) + (item.expenses || 0) + (item.diamondBuyIn || 0))
    }));
  }, [allTransactionsGraphData]);

  // สรุปธุรกรรมทองคำ - แยกชัดเจนระหว่าง น้ำหนัก vs เงิน
  const goldSummaryBoxes = summary ? [
    // ========== ส่วนที่ 1: น้ำหนักทองรูปพรรณ (กรัม) ==========
    { 
      label: "ทองซื้อเข้า", 
      value: summary.buyIn || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.buyIn || 0) / GOLD_BAHT_TO_GRAM_ORNAMENT, // น้ำหนักบาท
      color: "#51cf66", 
      icon: <TrendingUpIcon />,
      type: "weight", // ✅ แยกประเภทชัดเจน
      goldType: "ornament" 
    },
    { 
      label: "ทองขายออก", 
      value: summary.sellOut || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.sellOut || 0) / GOLD_BAHT_TO_GRAM_ORNAMENT,
      color: "#ff922b", 
      icon: <TrendingDownIcon />,
      type: "weight",
      goldType: "ornament" 
    },
    { 
      label: "เปลี่ยนทอง", 
      value: summary.exchange || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.exchange || 0) / GOLD_BAHT_TO_GRAM_ORNAMENT,
      color: "#ffd43b", 
      icon: <PaidIcon />,
      type: "weight",
      goldType: "ornament" 
    },
    { 
      label: "ทองชุบ", 
      value: summary.plated_gold || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.plated_gold || 0) / GOLD_BAHT_TO_GRAM_ORNAMENT,
      color: "#20c997", 
      icon: <AccountBalanceIcon />,
      type: "weight",
      goldType: "ornament" 
    },
    
    // ========== ส่วนที่ 2: น้ำหนักทองแท่ง (กรัม) ==========
    { 
      label: "ทองแท่งซื้อเข้า", 
      value: summary.bar_buy || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.bar_buy || 0) / GOLD_BAHT_TO_GRAM_BAR,
      color: "#339af0", 
      icon: <TrendingUpIcon />,
      type: "weight",
      goldType: "bar" 
    },
    { 
      label: "ทองแท่งขายออก", 
      value: summary.bar_sell || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.bar_sell || 0) / GOLD_BAHT_TO_GRAM_BAR,
      color: "#cc5de8", 
      icon: <TrendingDownIcon />,
      type: "weight",
      goldType: "bar" 
    },
    { 
      label: "ยอดรวมทองทั้งหมด", 
      value: summary.total_gold_flow || 0, 
      unit: "กรัม", 
      bahtWeight: (summary.total_gold_flow || 0) / GOLD_BAHT_TO_GRAM_BAR,
      color: "#495057", 
      icon: <ShowChartIcon />,
      type: "weight",
      goldType: "bar" 
    },
    
    // ========== ส่วนที่ 3: เงินทองแท่ง (บาท) ==========
    { 
      label: "เงินทองแท่งซื้อเข้า", 
      value: summary.bar_buy_amount || 0, 
      unit: "บาท", 
      bahtWeight: summary.bar_buy_amount || 0,
      color: "#228be6", 
      icon: <LocalAtmIcon />,
      type: "money",
      subValue: summary.avg_bar_buy_price_per_baht || 0,
      subLabel: "เฉลี่ยต่อบาทน้ำหนัก",
      subUnit: "บาท/บาท"
    },
    { 
      label: "เงินทองแท่งขายออก", 
      value: summary.bar_sell_amount || 0, 
      unit: "บาท", 
      bahtWeight: summary.bar_sell_amount || 0,
      color: "#be4bdb", 
      icon: <LocalAtmIcon />,
      type: "money",
      subValue: summary.avg_bar_sell_price_per_baht || 0,
      subLabel: "เฉลี่ยต่อบาทน้ำหนัก",
      subUnit: "บาท/บาท"
    },
    { 
      label: "ราคาทองแท่งซื้อเข้า", 
      value: summary.avg_bar_buy_price_per_gram || 0, 
      unit: "บาท/กรัม", 
      bahtWeight: summary.avg_bar_buy_price_per_gram || 0,
      color: "#12b886", 
      icon: <AttachMoneyIcon />,
      type: "price",
      subValue: summary.avg_bar_buy_price_per_baht || 0,
      subLabel: "ต่อบาทน้ำหนัก",
      subUnit: "บาท/บาท"
    },
    { 
      label: "ราคาทองแท่งขายออก", 
      value: summary.avg_bar_sell_price_per_gram || 0, 
      unit: "บาท/กรัม", 
      bahtWeight: summary.avg_bar_sell_price_per_gram || 0,
      color: "#fa5252", 
      icon: <AttachMoneyIcon />,
      type: "price",
      subValue: summary.avg_bar_sell_price_per_baht || 0,
      subLabel: "ต่อบาทน้ำหนัก",
      subUnit: "บาท/บาท"
    },
    { 
      label: "กำไรทองแท่ง", 
      value: summary.bar_profit || 0, 
      unit: "บาท", 
      bahtWeight: summary.bar_profit || 0,
      color: summary.bar_profit >= 0 ? "#40c057" : "#fa5252", 
      icon: summary.bar_profit >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />,
      type: "money",
      subValue: summary.bar_buy_amount > 0 ? ((summary.bar_profit / summary.bar_buy_amount) * 100) || 0 : 0,
      subLabel: "กำไรขั้นต้น",
      subUnit: "%"
    },
  ] : [];
  // สรุปธุรกรรมจำนำ
  const pawnSummaryBoxes = summary ? [
    { label: "ไถ่", value: summary.redeem || 0, unit: "บาท", color: "#748ffc", icon: <TrendingDownIcon /> },
    { label: "ดอก", value: summary.interest || 0, unit: "บาท", color: "#63e6be", icon: <TrendingUpIcon /> },
    { label: "จำนำ", value: summary.pawn || 0, unit: "บาท", color: "#ffa94d", icon: <TrendingUpIcon /> },
    { label: "ยอดรวม(ไถ่-จำนำ)", value: summary.total_pawn_flow || 0, unit: "บาท", color: "#ff6b6b", icon: <PaidIcon /> },
    { label: "ค่าใช้จ่าย", value: summary.expenses || 0, unit: "บาท", color: "#fcc419", icon: <TrendingDownIcon /> }
  ] : [];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ 
        p: { xs: 2, sm: 3, md: 4 }, 
        backgroundColor: COLOR_SCHEME.background,
        minHeight: '100vh'
      }}>
        {/* Header Section */}
        <Box sx={{ 
          mb: 4, 
          background: `linear-gradient(135deg, ${COLOR_SCHEME.primary} 0%, ${COLOR_SCHEME.secondary} 100%)`,
          borderRadius: 3,
          p: 4,
          color: 'white',
          boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)'
          }} />
          
          <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
            ห้างทองจินดา
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            ระบบจัดการธุรกรรมทองคำครบวงจร
          </Typography>
        </Box>

        {/* Period Selector และ Date Selector */}
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap', 
          gap: 2 
        }}>
          <ToggleButtonGroup 
            value={period} 
            exclusive 
            onChange={(_, v) => {
              if (v) {
                setPeriod(v);
                // รีเซ็ตวันที่เมื่อเปลี่ยน period
                if (v === "month") {
                  setSelectedDate(null);
                } else {
                  setSelectedDate(dayjs());
                }
              }
            }} 
            color="primary"
            sx={{
              '& .MuiToggleButton-root': {
                border: '2px solid transparent',
                '&.Mui-selected': {
                  backgroundColor: COLOR_SCHEME.primary,
                  color: 'white',
                  borderColor: COLOR_SCHEME.primary,
                  boxShadow: `0 4px 12px ${alpha(COLOR_SCHEME.primary, 0.3)}`,
                },
                '&:hover': {
                  borderColor: COLOR_SCHEME.primary,
                }
              }
            }}
          >
            <ToggleButton value="day" sx={{ px: 3, py: 1.5 }}>📅 วัน</ToggleButton>
            <ToggleButton value="week" sx={{ px: 3, py: 1.5 }}>📈 สัปดาห์</ToggleButton>
            <ToggleButton value="month" sx={{ px: 3, py: 1.5 }}>🗓 เดือน</ToggleButton>
          </ToggleButtonGroup>
          
          {/* Date/Month/Year Selector ตาม period */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {period === "day" && (
              <DatePicker
                label="เลือกวัน"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: 'small', sx: { width: 200 } } }}
              />
            )}
            
            {period === "week" && (
              <DatePicker
                label="เลือกสัปดาห์"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                views={['year', 'month', 'day']}
                format="DD/MM/YYYY"
                slotProps={{ 
                  textField: { 
                    size: 'small', 
                    sx: { width: 200 },
                    helperText: selectedDate 
                      ? `สัปดาห์ที่ ${selectedDate.week()} ของ ${selectedDate.format('MMMM YYYY')}`
                      : ''
                  } 
                }}
              />
            )}
            
            {period === "month" && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>เดือน</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="เดือน"
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {months.map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>ปี</InputLabel>
                  <Select
                    value={selectedYear}
                    label="ปี"
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year + 543} {/* แสดงเป็นพ.ศ. */}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </Box>

        {/* ✅ เพิ่มตรงนี้: แสดงช่วงข้อมูลสรุปและกราฟ */}
        {!isLoading && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            bgcolor: alpha(COLOR_SCHEME.primary, 0.05), 
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                ช่วงข้อมูลสรุป
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {getSummaryPeriodText()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                ช่วงข้อมูลกราฟ
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ color: COLOR_SCHEME.primary }}>
                {period === "week" ? "5 สัปดาห์ย้อนหลัง" : period === "month" ? "6 เดือนย้อนหลัง" : "วันเดียว"}
              </Typography>
            </Box>
          </Box>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <CircularProgress 
              size={80} 
              thickness={4} 
              sx={{ color: COLOR_SCHEME.primary }}
            />
          </Box>
        ) : (
          <>
            {/* 1. สรุปธุรกรรมทองคำ */}
            <Fade in={!isLoading} timeout={500}>
              <Box>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
                  color: COLOR_SCHEME.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <Box sx={{
                    width: 4,
                    height: 24,
                    backgroundColor: COLOR_SCHEME.primary,
                    borderRadius: 1
                  }} />
                  สรุปธุรกรรมทองคำ
                </Typography>
                
                <Grid container spacing={2} key={`gold-summary-${animationKey}`}>
                  {goldSummaryBoxes.map((item, index) => (
                    <Grid item xs={12} sm={6} md={3} key={item.label}>
                      <Grow in={!isLoading} timeout={index * 100}>
                        <Card sx={{
                          backgroundColor: 'white',
                          backgroundImage: goldPattern,
                          color: COLOR_SCHEME.textPrimary,
                          borderRadius: 3,
                          border: `1px solid ${alpha(item.color, 0.2)}`,
                          boxShadow: `0 4px 20px ${alpha(item.color, 0.1)}`,
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 32px ${alpha(item.color, 0.2)}`,
                          }
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              mb: 2 
                            }}>
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}>
                                <Box sx={{
                                  backgroundColor: alpha(item.color, 0.1),
                                  borderRadius: 2,
                                  p: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {item.icon}
                                </Box>
                                <Typography variant="body2" fontWeight={600} sx={{ color: item.color }}>
                                  {item.label}
                                </Typography>
                              </Box>
                            </Box>
                            
                            {/* ✅ แสดงข้อมูลตามประเภท */}
                            {item.type === "weight" && (
                              <>
                                {/* แสดงน้ำหนักกรัม */}
                                <Box sx={{ mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <ScaleIcon fontSize="small" sx={{ color: alpha(item.color, 0.7) }} />
                                    <Typography variant="body2" sx={{ color: alpha(item.color, 0.7) }}>
                                      น้ำหนัก (กรัม)
                                    </Typography>
                                  </Box>
                                  <Typography variant="h4" fontWeight={700} sx={{ color: item.color }}>
                                    {item.value.toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                                    {item.unit}
                                  </Typography>
                                </Box>
                                
                                {/* แสดงน้ำหนักบาท */}
                                <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(item.color, 0.1)}` }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <LocalAtmIcon fontSize="small" sx={{ color: alpha(COLOR_SCHEME.primary, 0.7) }} />
                                    <Typography variant="body2" sx={{ color: alpha(COLOR_SCHEME.primary, 0.7) }}>
                                      น้ำหนัก (บาท)
                                    </Typography>
                                  </Box>
                                  <Typography variant="h5" fontWeight={700} sx={{ color: COLOR_SCHEME.primary }}>
                                    {item.bahtWeight.toFixed(2)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                                    1 บาทน้ำหนัก = {item.goldType === "ornament" ? GOLD_BAHT_TO_GRAM_ORNAMENT : GOLD_BAHT_TO_GRAM_BAR} กรัม
                                  </Typography>
                                </Box>
                              </>
                            )}
                            
                            {item.type === "money" && (
                              <>
                                {/* แสดงจำนวนเงิน */}
                                <Box sx={{ mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <AttachMoneyIcon fontSize="small" sx={{ color: alpha(item.color, 0.7) }} />
                                    <Typography variant="body2" sx={{ color: alpha(item.color, 0.7) }}>
                                      จำนวนเงิน
                                    </Typography>
                                  </Box>
                                  <Typography variant="h4" fontWeight={700} sx={{ color: item.color }}>
                                    {item.value.toLocaleString()}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                                    {item.unit}
                                  </Typography>
                                </Box>
                                
                                {/* แสดงราคาเฉลี่ย (ถ้ามี) */}
                                {item.subValue !== undefined && item.subValue > 0 && (
                                  <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(item.color, 0.1)}` }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      <TrendingUpIcon fontSize="small" sx={{ color: alpha(COLOR_SCHEME.primary, 0.7) }} />
                                      <Typography variant="body2" sx={{ color: alpha(COLOR_SCHEME.primary, 0.7) }}>
                                        {item.subLabel}
                                      </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={700} sx={{ color: COLOR_SCHEME.primary }}>
                                      {item.subValue.toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                                      {item.subUnit}
                                    </Typography>
                                  </Box>
                                )}
                              </>
                            )}
                            
                            {item.type === "price" && (
                              <>
                                {/* แสดงราคาต่อกรัม */}
                                <Box sx={{ mb: 1.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <AttachMoneyIcon fontSize="small" sx={{ color: alpha(item.color, 0.7) }} />
                                    <Typography variant="body2" sx={{ color: alpha(item.color, 0.7) }}>
                                      ราคาเฉลี่ย
                                    </Typography>
                                  </Box>
                                  <Typography variant="h4" fontWeight={700} sx={{ color: item.color }}>
                                    {item.value.toFixed(2)}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                                    {item.unit}
                                  </Typography>
                                </Box>
                                
                                {/* แสดงราคาต่อบาทน้ำหนัก (ถ้ามี) */}
                                {item.subValue !== undefined && item.subValue > 0 && (
                                  <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(item.color, 0.1)}` }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      <LocalAtmIcon fontSize="small" sx={{ color: alpha(COLOR_SCHEME.primary, 0.7) }} />
                                      <Typography variant="body2" sx={{ color: alpha(COLOR_SCHEME.primary, 0.7) }}>
                                        {item.subLabel}
                                      </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight={700} sx={{ color: COLOR_SCHEME.primary }}>
                                      {item.subValue.toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                                      {item.subUnit}
                                    </Typography>
                                  </Box>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Grow>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>
            {/* 2. กราฟแนวโน้มธุรกรรมทอง */}
            <Fade in={!isLoading} timeout={600}>
              <Box mt={6} mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
                  color: COLOR_SCHEME.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <MultilineChartIcon sx={{ color: COLOR_SCHEME.primary }} />
                  แนวโน้มธุรกรรมทอง
                </Typography>
                
                <Grid container spacing={3}>
                  {/* กราฟทองรูปพรรณ (กรัม) */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                      p: { xs: 2, sm: 3 }, 
                      borderRadius: 3,
                      backgroundColor: 'white',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                      border: `1px solid ${alpha(COLOR_SCHEME.success, 0.1)}`,
                      height: '100%'
                    }}>
                      <Typography fontWeight={600} mb={2} sx={{ 
                        color: COLOR_SCHEME.textPrimary,
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <ScaleIcon sx={{ color: COLOR_SCHEME.success }} />
                        ทองรูปพรรณ (กรัม)
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <LineChart
                          dataset={allTransactionsGraphData}
                          xAxis={[
                            {
                              scaleType: 'band',
                              dataKey: 'date',
                              valueFormatter: (value: string) => formatXAxisTick(value),
                            },
                          ]}
                          series={[
                            {
                              dataKey: 'buyIn',
                              label: 'ทองซื้อเข้า',
                              color: COLOR_SCHEME.success,
                              showMark: false,
                              curve: 'monotoneX',
                              valueFormatter: (value: number | null) =>
                                value != null ? `${value.toLocaleString()} กรัม` : '',
                            },
                            {
                              dataKey: 'sellOut',
                              label: 'ทองขายออก',
                              color: COLOR_SCHEME.error,
                              showMark: false,
                              curve: 'monotoneX',
                              valueFormatter: (value: number | null) =>
                                value != null ? `${value.toLocaleString()} กรัม` : '',
                            },
                          ]}
                        />
                      </Box>
                    </Paper>
                  </Grid>

                  {/* กราฟทองแท่ง (บาทน้ำหนัก) */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                      p: { xs: 2, sm: 3 }, 
                      borderRadius: 3,
                      backgroundColor: 'white',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                      border: `1px solid ${alpha(COLOR_SCHEME.cyan, 0.1)}`,
                      height: '100%'
                    }}>
                      <Typography fontWeight={600} mb={2} sx={{ 
                        color: COLOR_SCHEME.textPrimary,
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <LocalAtmIcon sx={{ color: COLOR_SCHEME.cyan }} />
                        ทองแท่ง (บาทน้ำหนัก)
                      </Typography>
                      
                      <Box sx={{ height: 300 }}>
                        <LineChart
                          dataset={processedGoldChartData}
                          xAxis={[
                            {
                              scaleType: 'band',
                              dataKey: 'date',
                              valueFormatter: (value: string) => formatXAxisTick(value),
                            },
                          ]}
                          series={[
                            {
                              dataKey: 'bar_buy_baht',
                              label: 'ทองแท่งซื้อเข้า',
                              color: COLOR_SCHEME.cyan,
                              showMark: false,
                              curve: 'monotoneX',
                              valueFormatter: (value: number | null) =>
                                value != null ? `${value.toFixed(2)} บาท` : '',
                            },
                            {
                              dataKey: 'bar_sell_baht',
                              label: 'ทองแท่งขายออก',
                              color: COLOR_SCHEME.purple,
                              showMark: false,
                              curve: 'monotoneX',
                              valueFormatter: (value: number | null) =>
                                value != null ? `${value.toFixed(2)} บาท` : '',
                            },
                          ]}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
</Fade>
            {/* 3. สรุปธุรกรรมจำนำ */}
            <Fade in={!isLoading} timeout={700}>
              <Box mt={6}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
                  color: COLOR_SCHEME.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <Box sx={{
                    width: 4,
                    height: 24,
                    backgroundColor: '#748ffc',
                    borderRadius: 1
                  }} />
                  สรุปธุรกรรมจำนำ
                </Typography>
                
                <Grid container spacing={2} key={`pawn-summary-${animationKey}`}>
                  {pawnSummaryBoxes.map((item, index) => (
                    <Grid item xs={12} sm={6} md={3} key={item.label}>
                      <Grow in={!isLoading} timeout={index * 100 + 300}>
                        <Card sx={{
                          backgroundColor: 'white',
                          backgroundImage: goldPattern,
                          color: COLOR_SCHEME.textPrimary,
                          borderRadius: 3,
                          border: `1px solid ${alpha(item.color, 0.2)}`,
                          boxShadow: `0 4px 20px ${alpha(item.color, 0.1)}`,
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 32px ${alpha(item.color, 0.2)}`,
                          }
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              mb: 2 
                            }}>
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}>
                                <Box sx={{
                                  backgroundColor: alpha(item.color, 0.1),
                                  borderRadius: 2,
                                  p: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {item.icon}
                                </Box>
                                <Typography variant="body2" fontWeight={600} sx={{ color: item.color }}>
                                  {item.label}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="h4" fontWeight={700} sx={{ color: item.color }}>
                              {item.value.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" sx={{ color: COLOR_SCHEME.textSecondary, mt: 0.5 }}>
                              {item.unit}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grow>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>

            {/* 4. กราฟแนวโน้มธุรกรรมจำนำ */}
            <Fade in={!isLoading} timeout={800}>
              <Box mt={6} mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
                  color: COLOR_SCHEME.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <MultilineChartIcon sx={{ color: '#748ffc' }} />
                  แนวโน้มธุรกรรมจำนำ
                </Typography>
                
                <Paper sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  border: `1px solid ${alpha('#748ffc', 0.1)}`,
                  height: '100%'
                }}>
                  <Box sx={{ height: 350 }}>
                    <LineChart
                      dataset={allTransactionsGraphData}
                      xAxis={[
                        {
                          scaleType: 'band',
                          dataKey: 'date',
                          valueFormatter: (value: string) => formatXAxisTick(value),
                        },
                      ]}
                      series={[
                        {
                          dataKey: 'redeem',
                          label: 'ไถ่ทอง',
                          color: COLOR_SCHEME.success,
                          showMark: false,
                          curve: 'monotoneX',
                          valueFormatter: (value: number | null) =>
                            value != null ? `${value.toLocaleString()} บาท` : '',
                        },
                        {
                          dataKey: 'pawn',
                          label: 'รับจำนำ',
                          color: COLOR_SCHEME.error,
                          showMark: false,
                          curve: 'monotoneX',
                          valueFormatter: (value: number | null) =>
                            value != null ? `${value.toLocaleString()} บาท` : '',
                        },
                        {
                          dataKey: 'interest',
                          label: 'ดอกเบี้ย',
                          color: COLOR_SCHEME.warning,
                          showMark: false,
                          curve: 'monotoneX',
                          valueFormatter: (value: number | null) =>
                            value != null ? `${value.toLocaleString()} บาท` : '',
                        },
                      ]}
                    />
                  </Box>
                </Paper>
              </Box>
            </Fade>

            {/* 5. สรุปภาพรวมธุรกิจ */}
            <Fade in={!isLoading} timeout={900}>
              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
                  color: COLOR_SCHEME.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <AnalyticsIcon sx={{ color: COLOR_SCHEME.primary }} />
                  สรุปภาพรวมธุรกิจ
                </Typography>
                
                <Grid container spacing={2} key={`overall-summary-${animationKey}`}>
                  {/* ยอดขายสุทธิ */}
                  <Grid item xs={12} md={4}>
                    <Grow in={!isLoading} timeout={100}>
                      <Card sx={{
                        backgroundColor: 'white',
                        backgroundImage: goldPattern,
                        color: COLOR_SCHEME.textPrimary,
                        borderRadius: 3,
                        border: `2px solid ${alpha(COLOR_SCHEME.success, 0.3)}`,
                        boxShadow: `0 4px 20px ${alpha(COLOR_SCHEME.success, 0.1)}`,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 32px ${alpha(COLOR_SCHEME.success, 0.2)}`,
                        }
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 2 
                          }}>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              <Box sx={{
                                backgroundColor: alpha(COLOR_SCHEME.success, 0.1),
                                borderRadius: 2,
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <AttachMoneyIcon sx={{ color: COLOR_SCHEME.success }} />
                              </Box>
                              <Typography variant="body2" fontWeight={600} sx={{ color: COLOR_SCHEME.success }}>
                                ยอดขายสุทธิ
                              </Typography>
                            </Box>
                            <Chip 
                              label={`${calculatedSummary?.profitMargin ? calculatedSummary.profitMargin.toFixed(1) : '0.0'}%`}
                              size="small"
                              color={calculatedSummary && calculatedSummary.netProfit >= 0 ? "success" : "error"}
                            />
                          </Box>
                          <Typography variant="h3" fontWeight={700} sx={{ color: calculatedSummary && calculatedSummary.netProfit >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error }}>
                            {calculatedSummary ? calculatedSummary.netProfit.toLocaleString() : '0'} ฿
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                            รายได้: {calculatedSummary ? calculatedSummary.totalRevenue.toLocaleString() : '0'} ฿
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(100, Math.max(0, calculatedSummary?.profitMargin || 0))}
                            sx={{ 
                              mt: 2,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: alpha(COLOR_SCHEME.error, 0.2),
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: calculatedSummary && calculatedSummary.profitMargin >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error
                              }
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grow>
                  </Grid>

                  {/* ยอดทองในสต็อก */}
                  <Grid item xs={12} md={4}>
                    <Grow in={!isLoading} timeout={200}>
                      <Card sx={{
                        backgroundColor: 'white',
                        backgroundImage: goldPattern,
                        color: COLOR_SCHEME.textPrimary,
                        borderRadius: 3,
                        border: `2px solid ${alpha(COLOR_SCHEME.primary, 0.3)}`,
                        boxShadow: `0 4px 20px ${alpha(COLOR_SCHEME.primary, 0.1)}`,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 32px ${alpha(COLOR_SCHEME.primary, 0.2)}`,
                        }
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 2 
                          }}>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              <Box sx={{
                                backgroundColor: alpha(COLOR_SCHEME.primary, 0.1),
                                borderRadius: 2,
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <InventoryIcon sx={{ color: COLOR_SCHEME.primary }} />
                              </Box>
                              <Typography variant="body2" fontWeight={600} sx={{ color: COLOR_SCHEME.primary }}>
                                ทองในสต็อก
                              </Typography>
                            </Box>
                            <Chip 
                              label={calculatedSummary && calculatedSummary.goldNetFlow >= 0 ? "เกิน" : "ขาด"}
                              size="small"
                              color={calculatedSummary && calculatedSummary.goldNetFlow >= 0 ? "success" : "error"}
                            />
                          </Box>
                          <Typography variant="h3" fontWeight={700} sx={{ color: COLOR_SCHEME.primary }}>
                            {barGoldStock?.remaining_baht ? barGoldStock.remaining_baht.toLocaleString() : '0'} บาท
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                            ≈ {barGoldStock?.remaining_grams ? barGoldStock.remaining_grams.toFixed(2) : '0'} กรัม
                          </Typography>
                          <Stack direction="row" justifyContent="space-between" mt={2}>
                            <Typography variant="caption">
                              ทองเข้า: {calculatedSummary ? calculatedSummary.goldInStock.toLocaleString() : '0'} ก.
                            </Typography>
                            <Typography variant="caption">
                              ทองออก: {calculatedSummary ? calculatedSummary.goldOutStock.toLocaleString() : '0'} ก.
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grow>
                  </Grid>

                  {/* กำไรจำนำ */}
                  <Grid item xs={12} md={4}>
                    <Grow in={!isLoading} timeout={300}>
                      <Card sx={{
                        backgroundColor: 'white',
                        backgroundImage: goldPattern,
                        color: COLOR_SCHEME.textPrimary,
                        borderRadius: 3,
                        border: `2px solid ${alpha(COLOR_SCHEME.info, 0.3)}`,
                        boxShadow: `0 4px 20px ${alpha(COLOR_SCHEME.info, 0.1)}`,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 32px ${alpha(COLOR_SCHEME.info, 0.2)}`,
                        }
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 2 
                          }}>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              <Box sx={{
                                backgroundColor: alpha(COLOR_SCHEME.info, 0.1),
                                borderRadius: 2,
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <AccountBalanceWalletIcon sx={{ color: COLOR_SCHEME.info }} />
                              </Box>
                              <Typography variant="body2" fontWeight={600} sx={{ color: COLOR_SCHEME.info }}>
                                กำไรจำนำสุทธิ
                              </Typography>
                            </Box>
                            <Chip 
                              label={calculatedSummary && calculatedSummary.pawnProfit >= 0 ? "กำไร" : "ขาดทุน"}
                              size="small"
                              color={calculatedSummary && calculatedSummary.pawnProfit >= 0 ? "success" : "error"}
                            />
                          </Box>
                          <Typography variant="h3" fontWeight={700} sx={{ color: calculatedSummary && calculatedSummary.pawnProfit >= 0 ? COLOR_SCHEME.success : COLOR_SCHEME.error }}>
                            {calculatedSummary ? calculatedSummary.pawnProfit.toLocaleString() : '0'} ฿
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                            ไถ่: {summary?.redeem?.toLocaleString() || '0'} ฿ | จำนำ: {summary?.pawn?.toLocaleString() || '0'} ฿
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grow>
                  </Grid>
                </Grid>
              </Box>
            </Fade>

            {/* 6. กราฟแนวโน้มกำไรและรายได้ */}
            <Fade in={!isLoading} timeout={1000}>
              <Box mb={4}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3 
                }}>
                  <Typography variant="h5" fontWeight={600} sx={{ 
                    color: COLOR_SCHEME.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TimelineIcon sx={{ color: COLOR_SCHEME.primary }} />
                    แนวโน้มกำไรและรายได้
                  </Typography>
                  
                  <ToggleButtonGroup 
                    value={chartType}
                    exclusive
                    onChange={(_, v) => v && setChartType(v)}
                    size="small"
                  >
                    <ToggleButton value="bar" sx={{ px: 2 }}>
                      <ShowChartIcon fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 1 }}>Bar</Typography>
                    </ToggleButton>
                    <ToggleButton value="line" sx={{ px: 2 }}>
                      <TimelineIcon fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 1 }}>Line</Typography>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Paper sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 3,
                  backgroundColor: 'white',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                  border: `1px solid ${alpha(COLOR_SCHEME.primary, 0.1)}`
                }}>
                  <Box sx={{ height: 400 }}>
                    {chartType === 'bar' ? (
                      <BarChart
                        dataset={processedLineChartData}
                        xAxis={[{
                          scaleType: 'band',
                          dataKey: 'date',
                          valueFormatter: (value) => formatXAxisTick(value)
                        }]}
                        series={[
                          { dataKey: 'total_revenue', label: 'รายได้ทั้งหมด', color: COLOR_SCHEME.success, valueFormatter: (value) => `${Number(value).toLocaleString()} ฿` },
                          { dataKey: 'total_cost', label: 'ต้นทุนทั้งหมด', color: COLOR_SCHEME.error, valueFormatter: (value) => `${Number(value).toLocaleString()} ฿` },
                          { dataKey: 'net_profit', label: 'กำไรสุทธิ', color: COLOR_SCHEME.primary, valueFormatter: (value) => `${Number(value).toLocaleString()} ฿` },
                        ]}
                      />
                    ) : (
                      <LineChart
                        dataset={processedLineChartData}
                        xAxis={[
                          {
                            scaleType: 'band',
                            dataKey: 'date',
                            valueFormatter: (value: string) => formatXAxisTick(value),
                          },
                        ]}
                        series={[
                          {
                            dataKey: 'total_revenue',
                            label: 'รายได้ทั้งหมด',
                            color: COLOR_SCHEME.success,
                            area: true,
                            showMark: true,
                            curve: 'natural',
                            valueFormatter: (value: number | null) =>
                              value != null ? `${value.toLocaleString()} ฿` : '',
                          },
                          {
                            dataKey: 'total_cost',
                            label: 'ต้นทุนทั้งหมด',
                            color: COLOR_SCHEME.error,
                            area: true,
                            showMark: true,
                            curve: 'natural',
                            valueFormatter: (value: number | null) =>
                              value != null ? `${value.toLocaleString()} ฿` : '',
                          },
                          {
                            dataKey: 'net_profit',
                            label: 'กำไรสุทธิ',
                            color: COLOR_SCHEME.primary,
                            showMark: true,
                            curve: 'natural',
                            valueFormatter: (value: number | null) =>
                              value != null ? `${value.toLocaleString()} ฿` : '',
                          },
                        ]}
                      />
                    )}
                  </Box>
                </Paper>
              </Box>
            </Fade>

            {/* Bar Gold Stock */}
            <Fade in={!isLoading} timeout={1100}>
              <Box mt={6}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
                  color: COLOR_SCHEME.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3
                }}>
                  <Box sx={{
                    width: 4,
                    height: 24,
                    backgroundColor: COLOR_SCHEME.primary,
                    borderRadius: 1
                  }} />
                  ยอดคงเหลือทองแท่ง
                </Typography>
                
                {barGoldStock && barGoldStock.remaining_baht >= 1 ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Grow in={!isLoading} timeout={1200}>
                        <Card sx={{
                          backgroundColor: 'white',
                          background: `linear-gradient(135deg, #006400 0%, #228B22 100%)`,
                          color: 'white',
                          borderRadius: 3,
                          boxShadow: '0 8px 32px rgba(0,100,0,0.3)',
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(0,100,0,0.4)',
                          }
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, mb: 1 }}>
                              ยอดคงเหลือ (บาทน้ำหนัก)
                            </Typography>
                            <Typography variant="h3" fontWeight={700}>
                              {(barGoldStock.remaining_grams / GOLD_BAHT_TO_GRAM_BAR).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                              บาททอง
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grow>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Grow in={!isLoading} timeout={1300}>
                        <Card sx={{
                          backgroundColor: 'white',
                          background: `linear-gradient(135deg, #008000 0%, #32CD32 100%)`,
                          color: 'white',
                          borderRadius: 3,
                          boxShadow: '0 8px 32px rgba(0,128,0,0.3)',
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(0,128,0,0.4)',
                          }
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.9, mb: 1 }}>
                              ยอดคงเหลือ (กรัม)
                            </Typography>
                            <Typography variant="h3" fontWeight={700}>
                              {barGoldStock.remaining_grams.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                              กรัม
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grow>
                    </Grid>
                  </Grid>
                ) : (
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    backgroundColor: alpha(COLOR_SCHEME.primary, 0.05),
                    border: `1px dashed ${alpha(COLOR_SCHEME.primary, 0.3)}`
                  }}>
                    <Typography variant="body1" color="text.secondary" align="center">
                      ไม่มียอดคงเหลือทองแท่งในสต็อก
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Fade>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
}