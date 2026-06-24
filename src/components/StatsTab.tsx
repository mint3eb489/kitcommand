/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Commission, Ausarbeitung } from '../types.ts';
import { motion } from 'motion/react';
import { TrendingUp, Trophy, Calendar, Truck, MapPin } from 'lucide-react';
import { normalizeYear } from '../utils/date.ts';

interface StatsTabProps {
  commissions: Commission[];
  annualTarget: number;
  yearlyTargets?: Record<string, number>;
  availableYears: number[];
  ausarbeitungen?: Ausarbeitung[];
  currentUserEmail?: string;
  selectedColleague?: string;
  theme?: 'light' | 'dark' | 'sage' | 'ocean' | 'wood';
}

export const StatsTab: React.FC<StatsTabProps> = ({
  commissions,
  annualTarget,
  yearlyTargets,
  availableYears,
  ausarbeitungen = [],
  currentUserEmail,
  selectedColleague,
  theme,
}) => {
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterMonthBestellt, setFilterMonthBestellt] = useState<string>('all');
  const [filterMonthDelivery, setFilterMonthDelivery] = useState<string>('all');
  const [filterDeliveryYear, setFilterDeliveryYear] = useState<string>('all');
  const [activeCityTooltip, setActiveCityTooltip] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.city-row-container')) {
        setActiveCityTooltip(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Saisonalitäts-Daten berechnen (unabhängig von filterMonth, aber abhängig von filterYear)
  const monthlySeasonality = useMemo(() => {
    const dataset = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      name: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      fullName: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][i],
      revenue: 0,
      soldCount: 0,
      lostCount: 0,
      openCount: 0,
    }));

    commissions.forEach((c) => {
      const dateStr = c.resolvedAt || c.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      const monthIndex = date.getMonth(); // 0 to 11
      if (monthIndex >= 0 && monthIndex < 12) {
        const item = dataset[monthIndex];
        if (c.status === 'sold') {
          item.revenue += c.price || 0;
          item.soldCount += 1;
        } else if (c.status === 'lost') {
          item.lostCount += 1;
        } else if (c.status === 'open') {
          item.openCount += 1;
        }
      }
    });

    const maxRevenue = Math.max(...dataset.map((d) => d.revenue), 10000);
    const maxSoldCount = Math.max(...dataset.map((d) => d.soldCount), 5);

    return {
      dataset,
      maxRevenue,
      maxSoldCount,
    };
  }, [commissions, filterYear]);

  // Selected month items for Monats- & Saisonalitäts-Trend (Revenue / c.status === 'sold')
  const monthlySeasonalityFocusItems = useMemo(() => {
    if (filterMonth === 'all') return [];
    
    const items: Array<{
      id: string;
      name: string;
      price: number;
    }> = [];

    commissions.forEach((c) => {
      if (c.status !== 'sold') return;
      const dateStr = c.resolvedAt || c.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      if ((date.getMonth() + 1).toString() === filterMonth) {
        items.push({
          id: c.id,
          name: c.name,
          price: c.price || 0,
        });
      }
    });

    items.sort((a, b) => b.price - a.price);
    return items;
  }, [commissions, filterYear, filterMonth]);

  // Bestellungen Saisonalitäts-Daten berechnen (abhängig von filterYear)
  // Alle Kommissionen mit status === 'sold' und bestellt === true, sowie alle Ausarbeitungen (gelten als bestellt)
  const bestelltSeasonality = useMemo(() => {
    const dataset = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      name: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      fullName: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][i],
      sum: 0,
      count: 0,
    }));

    commissions.forEach((c) => {
      if (c.status !== 'sold' || !c.bestellt) return;
      const dateStr = c.bestelltAt || c.resolvedAt || c.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      const monthIndex = date.getMonth(); // 0 to 11
      if (monthIndex >= 0 && monthIndex < 12) {
        const dItem = dataset[monthIndex];
        dItem.sum += c.price || 0;
        dItem.count += 1;
      }
    });

    ausarbeitungen.forEach((a) => {
      const dateStr = a.orderedAt || a.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      const monthIndex = date.getMonth(); // 0 to 11
      if (monthIndex >= 0 && monthIndex < 12) {
        const dItem = dataset[monthIndex];
        dItem.sum += a.price || 0;
        dItem.count += 1;
      }
    });

    const maxSum = Math.max(...dataset.map((d) => d.sum), 10000);

    return {
      dataset,
      maxSum,
    };
  }, [commissions, filterYear, ausarbeitungen]);

  // Calculations for ordered commissions KPI based on active database filters
  const bestelltStats = useMemo(() => {
    let totalSum = 0;
    let totalCount = 0;

    commissions.forEach((c) => {
      if (c.status !== 'sold' || !c.bestellt) return;
      const dateStr = c.bestelltAt || c.resolvedAt || c.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      totalSum += c.price || 0;
      totalCount += 1;
    });

    ausarbeitungen.forEach((a) => {
      const dateStr = a.orderedAt || a.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      totalSum += a.price || 0;
      totalCount += 1;
    });

    let filteredSum = totalSum;
    let filteredCount = totalCount;
    const filteredItems: Array<{
      id: string;
      name: string;
      price: number;
    }> = [];

    if (filterMonthBestellt !== 'all') {
      filteredSum = 0;
      filteredCount = 0;
      commissions.forEach((c) => {
        if (c.status !== 'sold' || !c.bestellt) return;
        const dateStr = c.bestelltAt || c.resolvedAt || c.createdAt;
        if (!dateStr) return;
        const date = new Date(dateStr);
        const yearStr = date.getFullYear().toString();
        
        if (filterYear !== 'all' && yearStr !== filterYear) return;
        if ((date.getMonth() + 1).toString() === filterMonthBestellt) {
          filteredSum += c.price || 0;
          filteredCount += 1;
          filteredItems.push({
            id: c.id,
            name: c.name,
            price: c.price || 0,
          });
        }
      });

      ausarbeitungen.forEach((a) => {
        const dateStr = a.orderedAt || a.createdAt;
        if (!dateStr) return;
        const date = new Date(dateStr);
        const yearStr = date.getFullYear().toString();
        
        if (filterYear !== 'all' && yearStr !== filterYear) return;
        if ((date.getMonth() + 1).toString() === filterMonthBestellt) {
          filteredSum += a.price || 0;
          filteredCount += 1;
          filteredItems.push({
            id: a.id,
            name: a.customerName,
            price: a.price || 0,
          });
        }
      });

      filteredItems.sort((a, b) => b.price - a.price);
    }

    return {
      filteredSum,
      filteredCount,
      filteredItems,
    };
  }, [commissions, filterYear, filterMonthBestellt, ausarbeitungen]);

  // Delivery Saisonalität-Daten berechnen (abhängig von filterYear)
  // Alle Kommissionen mit status === 'sold' und einem eingetragenen Liefer-KW (deliveryKw)
  const deliverySeasonality = useMemo(() => {
    const dataset = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      name: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      fullName: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][i],
      sum: 0,
      count: 0,
    }));

    const parseKwAndYear = (kwStr: string, defaultYear: number): { week: number; year: number } | null => {
      if (!kwStr) return null;
      const numbers = kwStr.match(/\d+/g);
      if (!numbers || numbers.length === 0) return null;
      
      let week = 1;
      let year = defaultYear;
      
      if (numbers.length === 1) {
        week = parseInt(numbers[0], 10);
      } else {
        const n1 = parseInt(numbers[0], 10);
        const n2 = parseInt(numbers[1], 10);
        if (n1 > 53) {
          year = n1;
          week = n2;
        } else {
          week = n1;
          year = n2;
        }
      }
      
      if (year < 100) {
        year = 2000 + year;
      }
      
      if (week < 1 || week > 53) return null;
      if (year < 2000 || year > 2100) year = defaultYear;
      
      return { week, year };
    };

    const getMonthFromWeekAndYear = (week: number, year: number): number => {
      const jan4 = new Date(year, 0, 4);
      const day = jan4.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const startOfIsoYear = new Date(jan4.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      const targetDate = new Date(startOfIsoYear.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000 + 3 * 24 * 60 * 60 * 1000);
      return targetDate.getMonth();
    };

    commissions.forEach((c) => {
      if (c.status !== 'sold' || !c.deliveryKw) return;
      
      const dateStr = c.resolvedAt || c.createdAt;
      const defaultYear = dateStr ? new Date(dateStr).getFullYear() : 2026;
      
      const parsed = parseKwAndYear(c.deliveryKw, c.deliveryYear ? parseInt(normalizeYear(c.deliveryYear), 10) : defaultYear);
      if (!parsed) return;
      
      if (filterYear !== 'all' && parsed.year.toString() !== filterYear) return;

      const monthIndex = getMonthFromWeekAndYear(parsed.week, parsed.year);
      if (monthIndex >= 0 && monthIndex < 12) {
        const dItem = dataset[monthIndex];
        dItem.sum += c.price || 0;
        dItem.count += 1;
      }
    });

    ausarbeitungen.forEach((a) => {
      if (!a.deliveryKw) return;
      
      const dateStr = a.orderedAt || a.createdAt;
      const defaultYear = dateStr ? new Date(dateStr).getFullYear() : 2026;
      
      const parsed = parseKwAndYear(a.deliveryKw, a.deliveryYear ? parseInt(normalizeYear(a.deliveryYear), 10) : defaultYear);
      if (!parsed) return;
      
      if (filterYear !== 'all' && parsed.year.toString() !== filterYear) return;

      const monthIndex = getMonthFromWeekAndYear(parsed.week, parsed.year);
      if (monthIndex >= 0 && monthIndex < 12) {
        const dItem = dataset[monthIndex];
        dItem.sum += a.price || 0;
        dItem.count += 1;
      }
    });

    const maxSum = Math.max(...dataset.map((d) => d.sum), 10000);

    return {
      dataset,
      maxSum,
    };
  }, [commissions, filterYear, ausarbeitungen]);

  // Calculations for delivery commissions KPI based on active database filters
  const deliveryStats = useMemo(() => {
    let totalSum = 0;
    let totalCount = 0;
    const filteredItems: Array<{
      id: string;
      name: string;
      price: number;
      type: 'commission' | 'ausarbeitung';
      deliveryKw?: string;
      deliveryYear?: string;
    }> = [];

    const parseKwAndYear = (kwStr: string, defaultYear: number): { week: number; year: number } | null => {
      if (!kwStr) return null;
      const numbers = kwStr.match(/\d+/g);
      if (!numbers || numbers.length === 0) return null;
      
      let week = 1;
      let year = defaultYear;
      
      if (numbers.length === 1) {
        week = parseInt(numbers[0], 10);
      } else {
        const n1 = parseInt(numbers[0], 10);
        const n2 = parseInt(numbers[1], 10);
        if (n1 > 53) {
          year = n1;
          week = n2;
        } else {
          week = n1;
          year = n2;
        }
      }
      
      if (year < 100) {
        year = 2000 + year;
      }
      
      if (week < 1 || week > 53) return null;
      if (year < 2000 || year > 2100) year = defaultYear;
      
      return { week, year };
    };

    const getMonthFromWeekAndYear = (week: number, year: number): number => {
      const jan4 = new Date(year, 0, 4);
      const day = jan4.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const startOfIsoYear = new Date(jan4.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      const targetDate = new Date(startOfIsoYear.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000 + 3 * 24 * 60 * 60 * 1000);
      return targetDate.getMonth();
    };

    commissions.forEach((c) => {
      if (c.status !== 'sold' || !c.deliveryKw) return;
      
      const dateStr = c.resolvedAt || c.createdAt;
      const defaultYear = dateStr ? new Date(dateStr).getFullYear() : 2026;
      
      const parsed = parseKwAndYear(c.deliveryKw, c.deliveryYear ? parseInt(normalizeYear(c.deliveryYear), 10) : defaultYear);
      if (!parsed) return;
      
      if (filterYear !== 'all' && parsed.year.toString() !== filterYear) return;

      totalSum += c.price || 0;
      totalCount += 1;
    });

    ausarbeitungen.forEach((a) => {
      if (!a.deliveryKw) return;
      
      const dateStr = a.orderedAt || a.createdAt;
      const defaultYear = dateStr ? new Date(dateStr).getFullYear() : 2026;
      
      const parsed = parseKwAndYear(a.deliveryKw, a.deliveryYear ? parseInt(normalizeYear(a.deliveryYear), 10) : defaultYear);
      if (!parsed) return;
      
      if (filterYear !== 'all' && parsed.year.toString() !== filterYear) return;

      totalSum += a.price || 0;
      totalCount += 1;
    });

    let filteredSum = totalSum;
    let filteredCount = totalCount;

    if (filterMonthDelivery !== 'all') {
      filteredSum = 0;
      filteredCount = 0;
      commissions.forEach((c) => {
        if (c.status !== 'sold' || !c.deliveryKw) return;
        
        const dateStr = c.resolvedAt || c.createdAt;
        const defaultYear = dateStr ? new Date(dateStr).getFullYear() : 2026;
        
        const parsed = parseKwAndYear(c.deliveryKw, c.deliveryYear ? parseInt(normalizeYear(c.deliveryYear), 10) : defaultYear);
        if (!parsed) return;
        
        if (filterYear !== 'all' && parsed.year.toString() !== filterYear) return;

        const monthIndex = getMonthFromWeekAndYear(parsed.week, parsed.year);
        if ((monthIndex + 1).toString() === filterMonthDelivery) {
          filteredSum += c.price || 0;
          filteredCount += 1;
          filteredItems.push({
            id: c.id,
            name: c.name,
            price: c.price || 0,
            type: 'commission',
            deliveryKw: c.deliveryKw,
            deliveryYear: normalizeYear(c.deliveryYear),
          });
        }
      });

      ausarbeitungen.forEach((a) => {
        if (!a.deliveryKw) return;
        
        const dateStr = a.orderedAt || a.createdAt;
        const defaultYear = dateStr ? new Date(dateStr).getFullYear() : 2026;
        
        const parsed = parseKwAndYear(a.deliveryKw, a.deliveryYear ? parseInt(normalizeYear(a.deliveryYear), 10) : defaultYear);
        if (!parsed) return;
        
        if (filterYear !== 'all' && parsed.year.toString() !== filterYear) return;

        const monthIndex = getMonthFromWeekAndYear(parsed.week, parsed.year);
        if ((monthIndex + 1).toString() === filterMonthDelivery) {
          filteredSum += a.price || 0;
          filteredCount += 1;
          filteredItems.push({
            id: a.id,
            name: a.customerName,
            price: a.price || 0,
            type: 'ausarbeitung',
            deliveryKw: a.deliveryKw,
            deliveryYear: normalizeYear(a.deliveryYear),
          });
        }
      });

      filteredItems.sort((x, y) => {
        const xParsed = parseKwAndYear(x.deliveryKw || '', x.deliveryYear ? parseInt(normalizeYear(x.deliveryYear), 10) : 2026);
        const yParsed = parseKwAndYear(y.deliveryKw || '', y.deliveryYear ? parseInt(normalizeYear(y.deliveryYear), 10) : 2026);
        
        const xYear = xParsed ? xParsed.year : 9999;
        const xWeek = xParsed ? xParsed.week : 99;
        const yYear = yParsed ? yParsed.year : 9999;
        const yWeek = yParsed ? yParsed.week : 99;
        
        if (xYear !== yYear) {
          return xYear - yYear;
        }
        if (xWeek !== yWeek) {
          return xWeek - yWeek;
        }
        return y.price - x.price;
      });
    }

    return {
      filteredSum,
      filteredCount,
      filteredItems,
    };
  }, [commissions, filterYear, filterMonthDelivery, ausarbeitungen]);

  // Calculations for Monats-Filter and Jahres-Ziel (ignoring Monats-Filter)
  const stats = useMemo(() => {
    let annualRevenue = 0;

    // Open pipeline structure (Always calculated across all open items, ignoring filters)
    let openNeubau = 0;
    let openBestand = 0;
    let openKlein = 0;

    commissions.forEach((c) => {
      const targetDateStr = c.resolvedAt || c.createdAt;
      
      // Calculate annual revenue for target tracker (ignores monthly filters, only checks year)
      if (c.status === 'sold' && targetDateStr) {
        const date = new Date(targetDateStr);
        if (filterYear === 'all' || date.getFullYear().toString() === filterYear) {
          annualRevenue += c.price || 0;
        }
      }

      // Track open pipeline structures
      if (c.status === 'open') {
        const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
        if (type === 'neubau') openNeubau++;
        else if (type === 'kleinauftrag') openKlein++;
        else openBestand++;
      }
    });

    // Filtered data for general KPIs (respects both Year and Month filters)
    const filteredData = commissions.filter((c) => {
      if (c.status === 'open') return false;
      const targetDateStr = c.resolvedAt || c.createdAt;
      if (!targetDateStr) return false;
      const date = new Date(targetDateStr);

      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;

      return true;
    });

    let revenue = 0;
    let qualifiedSoldCount = 0;
    let qualifiedLostCount = 0;
    let qualifiedRevenue = 0;

    // Sold structure counts
    let soldNeubau = 0;
    let soldBestand = 0;
    let soldKlein = 0;

    filteredData.forEach((c) => {
      const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
      const isKlein = type === 'kleinauftrag';
      const price = c.price || 0;

      if (c.status === 'sold') {
        revenue += price;
        
        // Sold structures
        if (type === 'neubau') soldNeubau++;
        else if (type === 'kleinauftrag') soldKlein++;
        else soldBestand++;

        // Non-kleinauftrag counts as qualified for Win rates & order values
        if (!isKlein) {
          qualifiedSoldCount++;
          qualifiedRevenue += price;
        }
      } else if (c.status === 'lost') {
        if (!isKlein) {
          qualifiedLostCount++;
        }
      }
    });

    const totalQualified = qualifiedSoldCount + qualifiedLostCount;
    const winRate = totalQualified > 0 ? (qualifiedSoldCount / totalQualified) * 100 : 0;
    const avgValue = qualifiedSoldCount > 0 ? qualifiedRevenue / qualifiedSoldCount : 0;

    // Percentages for Sold Structure Donut Chart
    const totalSoldDonut = soldNeubau + soldBestand + soldKlein;
    const pctNeubau = totalSoldDonut > 0 ? (soldNeubau / totalSoldDonut) * 100 : 0;
    const pctBestand = totalSoldDonut > 0 ? (soldBestand / totalSoldDonut) * 100 : 0;
    const pctKlein = totalSoldDonut > 0 ? (soldKlein / totalSoldDonut) * 100 : 0;

    // Percentages for Open Structure Donut Chart
    const totalOpenDonut = openNeubau + openBestand + openKlein;
    const pctOpenNeubau = totalOpenDonut > 0 ? (openNeubau / totalOpenDonut) * 100 : 0;
    const pctOpenBestand = totalOpenDonut > 0 ? (openBestand / totalOpenDonut) * 100 : 0;
    const pctOpenKlein = totalOpenDonut > 0 ? (openKlein / totalOpenDonut) * 100 : 0;

    return {
      annualRevenue,
      revenue,
      qualifiedSoldCount,
      qualifiedLostCount,
      winRate,
      avgValue,
      donutSold: {
        total: totalSoldDonut,
        neubau: soldNeubau,
        bestand: soldBestand,
        klein: soldKlein,
        pctNeubau,
        pctBestand,
        pctKlein,
      },
      donutOpen: {
        total: totalOpenDonut,
        neubau: openNeubau,
        bestand: openBestand,
        klein: openKlein,
        pctNeubau: pctOpenNeubau,
        pctBestand: pctOpenBestand,
        pctKlein: pctOpenKlein,
      },
    };
  }, [commissions, filterYear, filterMonth]);

  // Städte-Statistik berechnen (abhängig von filterDeliveryYear)
  const cityStats = useMemo(() => {
    const counts: Record<string, { 
      cityName: string;
      count: number; 
      totalValue: number; 
      items: Array<{ id: string; name: string; price: number; deliveryKw?: string; deliveryYear?: string }> 
    }> = {};
    
    // Process sold commissions
    commissions.forEach((c) => {
      if (c.status === 'sold') {
        // Use specified deliveryYear if available, otherwise fallback to resolvedAt/createdAt year
        let deliveryYear = c.deliveryYear ? normalizeYear(c.deliveryYear) : '';
        if (!deliveryYear) {
          const dateStr = c.resolvedAt || c.createdAt;
          if (dateStr) {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              deliveryYear = parsedDate.getFullYear().toString();
            }
          }
        }
        if (!deliveryYear) {
          deliveryYear = new Date().getFullYear().toString();
        }
        
        if (filterDeliveryYear !== 'all' && deliveryYear !== filterDeliveryYear) return;

        const rawCity = c.city ? c.city.trim() : '';
        if (!rawCity) return;
        const cityKey = rawCity.toLowerCase();
        
        if (!counts[cityKey]) {
          counts[cityKey] = { cityName: rawCity, count: 0, totalValue: 0, items: [] };
        }
        counts[cityKey].count += 1;
        counts[cityKey].totalValue += c.price || 0;
        counts[cityKey].items.push({
          id: c.id,
          name: c.name,
          price: c.price || 0,
          deliveryKw: c.deliveryKw,
          deliveryYear: normalizeYear(c.deliveryYear) || deliveryYear,
        });
      }
    });

    // Process ausarbeitungen
    ausarbeitungen.forEach((a) => {
      // Use specified deliveryYear if available, otherwise fallback to orderedAt/createdAt year
      let deliveryYear = a.deliveryYear ? normalizeYear(a.deliveryYear) : '';
      if (!deliveryYear) {
        const dateStr = a.orderedAt || a.createdAt;
        if (dateStr) {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            deliveryYear = parsedDate.getFullYear().toString();
          }
        }
      }
      if (!deliveryYear) {
        deliveryYear = new Date().getFullYear().toString();
      }

      if (filterDeliveryYear !== 'all' && deliveryYear !== filterDeliveryYear) return;

      const rawCity = a.city ? a.city.trim() : '';
      if (!rawCity) return;
      const cityKey = rawCity.toLowerCase();

      if (!counts[cityKey]) {
        counts[cityKey] = { cityName: rawCity, count: 0, totalValue: 0, items: [] };
      }
      counts[cityKey].count += 1;
      counts[cityKey].totalValue += a.price || 0;
      counts[cityKey].items.push({
        id: a.id,
        name: a.customerName,
        price: a.price || 0,
        deliveryKw: a.deliveryKw,
        deliveryYear: normalizeYear(a.deliveryYear) || deliveryYear,
      });
    });

    // Helper to sort delivery KWs numerically
    const parseKw = (kwStr: string | undefined): number => {
      if (!kwStr) return 999;
      // Extract only digits, e.g. "KW 35" -> "35"
      const num = parseInt(kwStr.replace(/\D/g, ''), 10);
      return isNaN(num) ? 998 : num;
    };

    const list = Object.values(counts)
      .map((data) => {
        // Sort items inside each city by delivery KW ascending, then by name
        const sortedItems = [...data.items].sort((a, b) => {
          const kwA = parseKw(a.deliveryKw);
          const kwB = parseKw(b.deliveryKw);
          if (kwA !== kwB) return kwA - kwB;
          return a.name.localeCompare(b.name);
        });

        return {
          cityName: data.cityName,
          count: data.count,
          totalValue: data.totalValue,
          items: sortedItems,
        };
      })
      .sort((a, b) => b.count - a.count || b.totalValue - a.totalValue);

    const maxCount = list.length > 0 ? Math.max(...list.map(l => l.count)) : 1;

    return { list, maxCount };
  }, [commissions, ausarbeitungen, filterDeliveryYear]);

  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <div id="tab-stats" className="flex flex-col min-h-[500px]">
      <div className="flex flex-row justify-between items-center mb-6 gap-2 border-b border-slate-200/60 dark:border-zinc-800 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
          Umsatz & Abschluss
        </h2>

        <div className="flex gap-1.5 sm:gap-2 w-auto items-center shrink-0">
          <select
            id="filter-year"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="input-field text-[10px] sm:text-xs py-1.5 px-2 sm:py-2 sm:px-3 !w-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm"
          >
            <option value="all">Alle Jahre</option>
            {availableYears.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>

          <select
            id="filter-month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="input-field text-[10px] sm:text-xs py-1.5 px-2 sm:py-2 sm:px-3 !w-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm"
          >
            <option value="all">Ganzes Jahr</option>
            <option value="1">Januar</option>
            <option value="2">Februar</option>
            <option value="3">März</option>
            <option value="4">April</option>
            <option value="5">Mai</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Dezember</option>
          </select>
        </div>
      </div>

      {/* MONATS- & SAISONALITÄTS-TREND */}
      <div
        id="seasonality-trend-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group/trend"
      >
        {/* Soft background ambient glows */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend:bg-indigo-500/10 dark:group-hover/trend:bg-indigo-400/10 transition-colors duration-500" />
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend:bg-blue-500/10 dark:group-hover/trend:bg-blue-400/10 transition-colors duration-500" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-405">
                <Calendar className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Umsatz-Trend
                </span>
                <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Verteilung über die Monate & Jahre
                </span>
              </div>
            </div>
            
            {/* Quick Helper Badge */}
            <div className="text-[10px] text-slate-400 dark:text-zinc-550 font-semibold bg-white dark:bg-zinc-900 p-1.5 px-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 select-none shadow-3xs">
              💡 Tipp: Tippe einen Monat an, um zu filtern
            </div>
          </div>

          {/* Interactive Chart Area */}
          <div className="pt-2 pb-1 overflow-x-auto scrollbar-none">
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2.5 md:gap-4 select-none min-w-[280px]">
              {monthlySeasonality.dataset.map((item) => {
                const isSelected = filterMonth === item.monthIndex.toString();
                const isAnySelected = filterMonth !== 'all';
                const heightPercent = item.revenue > 0 ? (item.revenue / monthlySeasonality.maxRevenue) * 100 : 0;
                
                // Active bar has vibrant color; other bars have muted color if another bar is selected
                const barColorClass = isSelected
                  ? 'bg-gradient-to-t from-blue-600 to-indigo-550 shadow-[0_4px_14px_rgba(59,130,246,0.35)] dark:shadow-[0_4px_14px_rgba(59,130,246,0.2)]'
                  : isAnySelected
                    ? 'bg-slate-200/50 dark:bg-zinc-800/30 opacity-30 hover:opacity-60'
                    : 'bg-gradient-to-t from-blue-400/80 to-indigo-400/80 dark:from-blue-500/60 dark:to-indigo-500/60 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)]';

                return (
                  <div
                    key={item.monthIndex}
                    onClick={() => {
                      if (isSelected) {
                        setFilterMonth('all');
                      } else {
                        setFilterMonth(item.monthIndex.toString());
                      }
                    }}
                    className={`flex-1 flex flex-col items-center h-full group/bar cursor-pointer transition-all duration-300 ${isSelected ? 'scale-[1.03]' : 'hover:-translate-y-1'}`}
                  >
                    {/* Tooltip on bar hover (Standard and touch feedback) */}
                    <div className="absolute bottom-[105%] opacity-0 scale-95 group-hover/bar:opacity-100 group-hover/bar:scale-100 transition-all duration-200 pointer-events-none z-30 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl shadow-xl flex flex-col gap-1 items-start text-left min-w-[140px]">
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-100 leading-none mb-1">
                        {item.fullName} {filterYear !== 'all' ? filterYear : ''}
                      </p>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                        <span className="text-slate-400">Umsatz:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-250">{formatter.format(item.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px] border-t border-slate-100 dark:border-zinc-900 pt-1 mt-1">
                        <span className="text-slate-400">Geschlossen (Soll):</span>
                        <span className="font-mono font-bold text-emerald-500">{item.soldCount}x</span>
                      </div>
                      {item.lostCount > 0 && (
                        <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                          <span className="text-slate-400">Nicht Verkauft:</span>
                          <span className="font-mono font-bold text-red-500">{item.lostCount}x</span>
                        </div>
                      )}
                      {item.openCount > 0 && (
                        <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                          <span className="text-slate-400">Offen Pipeline:</span>
                          <span className="font-mono font-bold text-blue-500">{item.openCount}x</span>
                        </div>
                      )}
                    </div>

                    {/* Bar visual track */}
                    <div className="w-full bg-slate-100/50 dark:bg-zinc-950 rounded-xl relative flex-1 flex items-end p-0.5 border border-slate-200/30 dark:border-zinc-900/40">
                      {/* Interactive internal bar */}
                      <motion.div
                        className={`w-full rounded-lg transition-all duration-300 ${barColorClass}`}
                        style={{ height: `${heightPercent || 2}%`, minHeight: '6px' }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>

                    {/* Month Label */}
                    <span className={`text-[9px] font-black uppercase tracking-wider mt-2 transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saisonalität Summary / Active Focus Info */}
          <div className="bg-white dark:bg-zinc-900/95 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-500 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {filterMonth === 'all' ? 'Aktive Auswertung' : `Fokus Monat: ${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][parseInt(filterMonth) - 1]}`}
                </p>
                {filterMonth === 'all' ? (
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                    Gesamtsaisonales Bild des selektierten Jahres.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-1.5 pr-2">
                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-405 select-none">
                      Geschlossene Kommissionen in diesem Monat:
                    </p>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 max-h-[80px] sm:max-h-[105px] overflow-y-auto scrollbar-none pb-1">
                      {monthlySeasonalityFocusItems && monthlySeasonalityFocusItems.length > 0 ? (
                        monthlySeasonalityFocusItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700/60 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold sm:font-bold text-slate-700 dark:text-zinc-300 transition-colors shadow-3xs"
                          >
                            <span className="truncate max-w-[100px] sm:max-w-[140px] font-sans">{item.name}</span>
                            <span className="text-[8.5px] font-normal text-slate-555 dark:text-zinc-400 font-mono">({formatter.format(item.price)})</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] italic text-slate-455">Keine geschlossenen Kommissionen</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 items-center md:justify-end shrink-0 w-full md:w-auto">
              <div className="text-left md:text-right bg-slate-50 dark:bg-zinc-950/40 p-2 pl-3 pr-3 sm:pl-3.5 sm:pr-3.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/60 shadow-3xs w-full md:w-auto">
                <span className="text-[8.5px] sm:text-[9px] font-semibold sm:font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-widest block leading-none mb-1 sm:mb-1.5">
                  {filterMonth === 'all' ? 'Gesamtumsatz' : 'Monatsumsatz'}
                </span>
                <span className="font-mono text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-350 block leading-none">
                  {formatter.format(
                    filterMonth === 'all' 
                      ? stats.revenue 
                      : (monthlySeasonality.dataset[parseInt(filterMonth) - 1]?.revenue || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

         {/* TREND-BALKENDIAGRAMM (BESTELLUNGEN) */}
      <div
        id="bestellungen-trend-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group/trend2"
      >
        {/* Soft background ambient glows */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend2:bg-emerald-500/10 dark:group-hover/trend2:bg-emerald-400/10 transition-colors duration-500" />
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-green-500/5 dark:bg-green-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend2:bg-green-500/10 dark:group-hover/trend2:bg-green-400/10 transition-colors duration-500" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                <Trophy className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Bestell-Trend
                </span>
                <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Umsatz an fertig bestellten Kommissionen pro Monat
                </span>
              </div>
            </div>
            
            {/* Quick Helper Badge */}
            <div className="text-[10px] text-slate-400 dark:text-zinc-550 font-semibold bg-white dark:bg-zinc-900 p-1.5 px-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 select-none shadow-3xs">
              💡 Tipp: Tippe einen Monat an, um zu filtern
            </div>
          </div>

          {/* Interactive Chart Zone */}
          <div className="pt-2 pb-1 overflow-x-auto scrollbar-none">
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2.5 md:gap-4 select-none min-w-[280px]">
              {bestelltSeasonality.dataset.map((item) => {
                const isSelected = filterMonthBestellt === item.monthIndex.toString();
                const isAnySelected = filterMonthBestellt !== 'all';
                const heightPercent = item.sum > 0 ? (item.sum / bestelltSeasonality.maxSum) * 100 : 0;
                
                const barColorClass = isSelected
                  ? 'bg-gradient-to-t from-emerald-600 to-green-500 shadow-[0_4px_14px_rgba(16,185,129,0.35)] dark:shadow-[0_4px_14px_rgba(16,185,129,0.2)]'
                  : isAnySelected
                    ? 'bg-slate-200/50 dark:bg-zinc-800/30 opacity-30 hover:opacity-60'
                    : 'bg-gradient-to-t from-emerald-400/80 to-green-400/80 dark:from-emerald-500/60 dark:to-green-500/60 hover:from-emerald-500 hover:to-green-500 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)]';

                return (
                  <div
                    key={item.monthIndex}
                    onClick={() => {
                      if (isSelected) {
                        setFilterMonthBestellt('all');
                      } else {
                        setFilterMonthBestellt(item.monthIndex.toString());
                      }
                    }}
                    className={`flex-1 flex flex-col items-center h-full group/bar cursor-pointer transition-all duration-300 ${isSelected ? 'scale-[1.03]' : 'hover:-translate-y-1'}`}
                  >
                    {/* Tooltip on bar hover */}
                    <div className="absolute bottom-[105%] opacity-0 scale-95 group-hover/bar:opacity-100 group-hover/bar:scale-100 transition-all duration-200 pointer-events-none z-30 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl shadow-xl flex flex-col gap-1 items-start text-left min-w-[140px]">
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-100 leading-none mb-1">
                        {item.fullName} {filterYear !== 'all' ? filterYear : ''}
                      </p>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                        <span className="text-slate-400">Bestellwert:</span>
                        <span className="font-mono font-bold text-emerald-500">{formatter.format(item.sum)}</span>
                      </div>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px] border-t border-slate-100 dark:border-zinc-900 pt-1 mt-1">
                        <span className="text-slate-400">Bestellt:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-250">{item.count}x</span>
                      </div>
                    </div>

                    {/* Bar visual track */}
                    <div className="w-full bg-slate-100/50 dark:bg-zinc-950 rounded-xl relative flex-1 flex items-end p-0.5 border border-slate-200/30 dark:border-zinc-900/40">
                      <motion.div
                        className={`w-full rounded-lg transition-all duration-300 ${barColorClass}`}
                        style={{ height: `${heightPercent || 2}%`, minHeight: '6px' }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>

                    {/* Month Label */}
                    <span className={`text-[9px] font-black uppercase tracking-wider mt-2 transition-colors ${isSelected ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Summary Panel */}
          <div className="bg-white dark:bg-zinc-900/95 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-500 animate-pulse shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {filterMonthBestellt === 'all' ? 'Aktiver Trend' : `Fokus Monat: ${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][parseInt(filterMonthBestellt) - 1]}`}
                </p>
                {filterMonthBestellt === 'all' ? (
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                    Bestellte Umsätze über die Monate.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-1.5 pr-2">
                    <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-405 select-none">
                      Bestellungen in diesem Monat:
                    </p>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 max-h-[80px] sm:max-h-[105px] overflow-y-auto scrollbar-none pb-1">
                      {bestelltStats.filteredItems && bestelltStats.filteredItems.length > 0 ? (
                        bestelltStats.filteredItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700/60 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold sm:font-bold text-slate-700 dark:text-zinc-300 transition-colors shadow-3xs"
                          >
                            <span className="truncate max-w-[100px] sm:max-w-[140px] font-sans">{item.name}</span>
                            <span className="text-[8.5px] font-normal text-slate-555 dark:text-zinc-400 font-mono">({formatter.format(item.price)})</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] italic text-slate-455">Keine Bestellungen</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 items-center md:justify-end shrink-0 w-full md:w-auto">
              <div className="text-left md:text-right bg-slate-50 dark:bg-zinc-950/40 p-2 pl-3 pr-3 sm:pl-3.5 sm:pr-3.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/60 shadow-3xs flex flex-col md:items-end w-full md:w-auto">
                <span className="text-[8.5px] sm:text-[9px] font-semibold sm:font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-widest block leading-none mb-1 sm:mb-1.5">
                  {filterMonthBestellt === 'all' ? 'Bestellt (Gesamt)' : 'Monatssumme Bestellt'}
                </span>
                <span className="font-mono text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-450 block leading-none">
                  {formatter.format(bestelltStats.filteredSum)}
                </span>
                <span className="text-[8.5px] sm:text-[9px] font-medium text-slate-400 dark:text-zinc-500 mt-1 block leading-none">
                  Gesamtanzahl: {bestelltStats.filteredCount}x
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TREND-BALKENDIAGRAMM (AUSLIEFERUNGEN) */}
      <div
        id="delivery-trend-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group/trend3"
      >
        {/* Soft background ambient glows */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/5 dark:bg-amber-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend3:bg-amber-500/10 dark:group-hover/trend3:bg-amber-400/10 transition-colors duration-500" />
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-yellow-500/5 dark:bg-yellow-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend3:bg-yellow-500/10 dark:group-hover/trend3:bg-yellow-400/10 transition-colors duration-500" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400">
                <Truck className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Auslieferungs-Trend
                </span>
                <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Umsatz an der Auslieferungswoche zugeordneten Kommissionen pro Monat
                </span>
              </div>
            </div>
            
            {/* Quick Helper Badge */}
            <div className="text-[10px] text-slate-400 dark:text-zinc-550 font-semibold bg-white dark:bg-zinc-900 p-1.5 px-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 select-none shadow-3xs">
              💡 Tipp: Tippe einen Monat an, um zu filtern
            </div>
          </div>

          {/* Interactive Chart Zone */}
          <div className="pt-2 pb-1 overflow-x-auto scrollbar-none">
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2.5 md:gap-4 select-none min-w-[280px]">
              {deliverySeasonality.dataset.map((item) => {
                const isSelected = filterMonthDelivery === item.monthIndex.toString();
                const isAnySelected = filterMonthDelivery !== 'all';
                const heightPercent = item.sum > 0 ? (item.sum / deliverySeasonality.maxSum) * 100 : 0;
                
                const barColorClass = isSelected
                  ? 'bg-gradient-to-t from-amber-600 to-orange-500 shadow-[0_4px_14px_rgba(245,158,11,0.35)] dark:shadow-[0_4px_14px_rgba(245,158,11,0.2)]'
                  : isAnySelected
                    ? 'bg-slate-200/50 dark:bg-zinc-800/30 opacity-30 hover:opacity-60'
                    : 'bg-gradient-to-t from-amber-400/80 to-yellow-400/80 dark:from-amber-500/60 dark:to-yellow-500/60 hover:from-amber-500 hover:to-orange-500 hover:shadow-[0_4px_12px_rgba(245,158,11,0.15)]';

                return (
                  <div
                    key={item.monthIndex}
                    onClick={() => {
                      if (isSelected) {
                        setFilterMonthDelivery('all');
                      } else {
                        setFilterMonthDelivery(item.monthIndex.toString());
                      }
                    }}
                    className={`flex-1 flex flex-col items-center h-full group/bar cursor-pointer transition-all duration-300 ${isSelected ? 'scale-[1.03]' : 'hover:-translate-y-1'}`}
                  >
                    {/* Tooltip on bar hover */}
                    <div className="absolute bottom-[105%] opacity-0 scale-95 group-hover/bar:opacity-100 group-hover/bar:scale-100 transition-all duration-200 pointer-events-none z-30 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl shadow-xl flex flex-col gap-1 items-start text-left min-w-[140px]">
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-100 leading-none mb-1">
                        {item.fullName} {filterYear !== 'all' ? filterYear : ''}
                      </p>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                        <span className="text-slate-400">Lieferwert:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatter.format(item.sum)}</span>
                      </div>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px] border-t border-slate-100 dark:border-zinc-900 pt-1 mt-1">
                        <span className="text-slate-400">Auslieferungen:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-250">{item.count}x</span>
                      </div>
                    </div>

                    {/* Bar visual track */}
                    <div className="w-full bg-slate-100/50 dark:bg-zinc-950 rounded-xl relative flex-1 flex items-end p-0.5 border border-slate-200/30 dark:border-zinc-900/40">
                      <motion.div
                        className={`w-full rounded-lg transition-all duration-300 ${barColorClass}`}
                        style={{ height: `${heightPercent || 2}%`, minHeight: '6px' }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>

                    {/* Month Label */}
                    <span className={`text-[9px] font-black uppercase tracking-wider mt-2 transition-colors ${isSelected ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Summary Panel */}
          <div className="bg-white dark:bg-zinc-900/95 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-500 animate-pulse shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {filterMonthDelivery === 'all' ? 'Aktiver Trend' : `Fokus Monat: ${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][parseInt(filterMonthDelivery) - 1]}`}
                </p>
                {filterMonthDelivery === 'all' ? (
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                    Ausgelieferte Umsätze (KW-berechnet) über die Monate.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-1.5 pr-2">
                    <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-450 select-none">
                      Lieferungen in diesem Monat:
                    </p>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 max-h-[80px] sm:max-h-[105px] overflow-y-auto scrollbar-none pb-1">
                      {deliveryStats.filteredItems && deliveryStats.filteredItems.length > 0 ? (
                        deliveryStats.filteredItems.map((item) => (
                          <div 
                            key={item.id} 
                            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700/60 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold sm:font-bold text-slate-700 dark:text-zinc-300 transition-colors shadow-3xs"
                            title={`${item.name} - KW ${item.deliveryKw || ''}${item.deliveryYear ? ` / ${item.deliveryYear}` : ''}`}
                          >
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8.5px] font-mono font-black border leading-none shrink-0 theme-kw-badge shadow-3xs select-none">
                              {item.deliveryKw ? `KW ${item.deliveryKw.toUpperCase().replace('KW', '').trim()}` : 'KW ?'}
                            </span>
                            <span className="truncate max-w-[100px] sm:max-w-[120px] font-sans">{item.name}</span>
                            <span className="text-[8.5px] font-normal text-slate-555 dark:text-zinc-400 font-mono">({formatter.format(item.price)})</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] italic text-slate-450">Keine Lieferungen zugeteilt</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 items-center md:justify-end shrink-0 w-full md:w-auto">
              <div className="text-left md:text-right bg-slate-50 dark:bg-zinc-950/40 p-2 pl-3 pr-3 sm:pl-3.5 sm:pr-3.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/60 shadow-3xs flex flex-col md:items-end w-full md:w-auto">
                <span className="text-[8.5px] sm:text-[9px] font-semibold sm:font-bold text-slate-455 dark:text-zinc-500 uppercase tracking-widest block leading-none mb-1 sm:mb-1.5">
                  {filterMonthDelivery === 'all' ? 'Ausgeliefert (Gesamt)' : 'Monatssumme Ausgeliefert'}
                </span>
                <span className="font-mono text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-450 block leading-none">
                  {formatter.format(deliveryStats.filteredSum)}
                </span>
                <span className="text-[8.5px] sm:text-[9px] font-medium text-slate-400 dark:text-zinc-500 mt-1 block leading-none">
                  Gesamtanzahl: {deliveryStats.filteredCount}x
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOWN / CITY STATISTICS */}
      <div
        id="city-statistics-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 relative isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group/city"
      >
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl group-hover/city:bg-emerald-500/10 dark:group-hover/city:bg-emerald-400/10 transition-colors duration-500" />
        </div>
        
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-405">
                <MapPin className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-550">
                  Top-Lieferorte & Verkaufs-Städte
                </span>
                <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  In welchen Städten und Gemeinden wurden die meisten Küchen ausgeliefert?
                </span>
              </div>
            </div>

            {/* Delivery Year Filter Dropdown */}
            <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider hidden xs:inline">
                Lieferjahr:
              </span>
              <select
                id="filter-delivery-year"
                value={filterDeliveryYear}
                onChange={(e) => setFilterDeliveryYear(e.target.value)}
                className="text-[10px] sm:text-xs py-1.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 text-slate-800 dark:text-zinc-100 shadow-3xs rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 font-bold cursor-pointer transition-all hover:border-slate-300 dark:hover:border-zinc-750"
              >
                <option value="all">Alle Lieferjahre</option>
                {availableYears.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            {cityStats.list.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                 {cityStats.list.slice(0, 8).map((city, index) => {
                   const percentWidth = (city.count / cityStats.maxCount) * 100;
                   return (
                     <div 
                       key={city.cityName} 
                       className="space-y-1.5 group/city-row relative city-row-container cursor-pointer select-none"
                       onClick={(e) => {
                         e.stopPropagation();
                         setActiveCityTooltip(prev => prev === city.cityName ? null : city.cityName);
                       }}
                     >
                       <div className="flex justify-between items-center text-xs">
                         <div className="flex items-center gap-2">
                           <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-550 font-bold w-4">
                             #{index + 1}
                           </span>
                           <span className="font-semibold text-slate-800 dark:text-zinc-200 cursor-help border-b border-dashed border-slate-300 dark:border-zinc-750 pb-0.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                             {city.cityName}
                           </span>
                         </div>
                         <div className="flex items-center gap-2 font-semibold">
                           <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                             {city.count} {city.count === 1 ? 'Küche' : 'Küchen'}
                           </span>
                           <span className="text-slate-400 dark:text-zinc-550 text-[10px] font-normal font-mono">
                             ({formatter.format(city.totalValue)})
                           </span>
                         </div>
                       </div>

                       {/* Bar visualization */}
                       <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden relative border border-slate-200/40 dark:border-zinc-800/40">
                         <motion.div
                           className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                           initial={{ width: 0 }}
                           animate={{ width: `${percentWidth}%` }}
                           transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                         />
                       </div>

                       {/* Interactive Hover Tooltip for Commissions */}
                       {city.items.length > 0 && (
                         <div 
                           className={`top-deliveries-tooltip absolute z-50 transition-all duration-200 bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-3 shadow-xl w-64 left-6 text-[11px] leading-normal font-sans text-slate-700 dark:text-zinc-300 ${
                             activeCityTooltip === city.cityName
                               ? 'visible opacity-100 pointer-events-auto'
                               : 'invisible group-hover/city-row:visible opacity-0 group-hover/city-row:opacity-100 pointer-events-none'
                           } ${
                             index < 4 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                           }`}
                         >
                           <div className="tooltip-title font-bold border-b border-slate-100 dark:border-zinc-900 pb-1 mb-1.5 flex justify-between items-center text-slate-800 dark:text-zinc-100 text-[11px]">
                             <span className="truncate max-w-[170px]">{city.cityName}</span>
                             <span className="tooltip-count-badge font-mono text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-extrabold shrink-0">{city.count}x</span>
                           </div>
                           <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-none pr-0.5">
                             {city.items.map((item, idx) => (
                               <div key={item.id + '-' + idx} className="tooltip-item-row flex justify-between items-center gap-1.5 py-0.5 border-b border-slate-50 dark:border-zinc-900/30 last:border-0">
                                 <span className="tooltip-item-name truncate text-slate-700 dark:text-zinc-300 font-semibold max-w-[120px]">{item.name}</span>
                                 <div className="flex items-center gap-1.5 shrink-0">
                                   <span className="tooltip-item-kw text-[8.5px] font-mono px-1 py-0.5 rounded font-black border bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/30 dark:border-amber-900/30 leading-none">
                                     {item.deliveryKw ? `KW ${item.deliveryKw.toUpperCase().replace('KW', '').trim()}` : 'KW ?'}
                                   </span>
                                   <span className="tooltip-item-price font-mono text-[10px] font-bold text-slate-500 dark:text-zinc-400">{formatter.format(item.price)}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                           {/* Arrow pointing to the row */}
                           <div 
                             className={`tooltip-arrow absolute left-6 w-2.5 h-2.5 bg-white dark:bg-zinc-950 ${
                               index < 4 
                                 ? 'bottom-full -mb-[5px] border-l border-t border-slate-200/80 dark:border-zinc-800/80' 
                                 : 'top-full -mt-[5px] border-r border-b border-slate-200/80 dark:border-zinc-800/80'
                             } rotate-45`} 
                           />
                         </div>
                       )}
                     </div>
                   );
                 })}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-950/40 p-8 rounded-2xl border border-dashed border-slate-205 dark:border-zinc-805 text-center flex flex-col items-center justify-center space-y-2">
                <MapPin className="w-10 h-10 text-slate-300 dark:text-zinc-700 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Keine Stadtdaten erfasst</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-550 max-w-sm">
                  Erfasse bei den Kommissionen oder Ausarbeitungen Postleitzahlen oder Stadtnamen. Diese werden hier automatisch ausgewertet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center italic mt-auto pt-4 border-t border-slate-200 dark:border-zinc-800">
        In den Monats-Trends sind alle regulären Verkäufe, offenen Angebote und Auslieferungen enthalten. Kleinaufträge zählen zum Gesamtumsatz.
      </p>
    </div>
  );
};
