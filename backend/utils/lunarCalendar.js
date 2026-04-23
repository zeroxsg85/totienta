/**
 * Thuật toán chuyển đổi Dương lịch ↔ Âm lịch (Hồ Ngọc Đức)
 * Timezone mặc định UTC+7 (Việt Nam)
 */
const TZ = 7;

function jdFromDate(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4)
        - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) {
        jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    }
    return jd;
}

function jdToDate(jd) {
    let a;
    if (jd > 2299160) {
        const alpha = Math.floor((jd - 1867216.25) / 36524.25);
        a = jd + 1 + alpha - Math.floor(alpha / 4);
    } else {
        a = jd;
    }
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e);
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;
    return { day, month, year };
}

function getNewMoonDay(k, tz) {
    const PI = Math.PI;
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 += 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (M + 2 * Mpr));
    let deltat;
    if (T < -11) {
        deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
        deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return Math.floor(Jd1 + C1 - deltat + 0.5 + tz / 24);
}

function getSunLongitude(jdn, tz) {
    const PI = Math.PI;
    const T = (jdn - 2451545.5 - tz / 24) / 36525;
    const T2 = T * T;
    const dr = PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = L0 + DL;
    L = L / 360 - Math.floor(L / 360);
    return Math.floor(L * 12);
}

function getLunarMonth11(yy, tz) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = Math.floor(off / 29.530588853);
    let nm = getNewMoonDay(k, tz);
    if (getSunLongitude(nm, tz) >= 9) nm = getNewMoonDay(k - 1, tz);
    return nm;
}

function getLeapMonthOffset(a11, tz) {
    const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
    let last;
    do {
        last = arc;
        i++;
        arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
    } while (arc !== last && i < 14);
    return i - 1;
}

/** Dương lịch → Âm lịch */
function solar2Lunar(dd, mm, yy) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, TZ);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, TZ);
    let a11 = getLunarMonth11(yy, TZ);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
        lunarYear = yy;
        a11 = getLunarMonth11(yy - 1, TZ);
    } else {
        lunarYear = yy + 1;
        b11 = getLunarMonth11(yy + 1, TZ);
    }
    const lunarDay = dayNumber - monthStart + 1;
    const diff = Math.floor((monthStart - a11) / 29);
    let lunarLeap = false;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
        const leapOff = getLeapMonthOffset(a11, TZ);
        if (diff >= leapOff) {
            lunarMonth = diff + 10;
            if (diff === leapOff) lunarLeap = true;
        }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeap: lunarLeap };
}

/** Âm lịch → Dương lịch (trả về { day, month, year } hoặc null nếu lỗi) */
function lunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap = false) {
    let a11, b11;
    if (lunarMonth < 11) {
        a11 = getLunarMonth11(lunarYear - 1, TZ);
        b11 = getLunarMonth11(lunarYear, TZ);
    } else {
        a11 = getLunarMonth11(lunarYear, TZ);
        b11 = getLunarMonth11(lunarYear + 1, TZ);
    }
    const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let off = lunarMonth - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
        const leapOff = getLeapMonthOffset(a11, TZ);
        const leapMonth = (leapOff + 10) % 12;
        if (lunarLeap && lunarMonth !== leapMonth) return null;
        if (lunarLeap || off >= leapOff) off += 1;
    }
    const monthStart = getNewMoonDay(k + off, TZ);
    return jdToDate(monthStart + lunarDay - 1);
}

/**
 * Tìm ngày dương lịch của một ngày âm lịch (ngày/tháng) trong năm dương lịch cho trước.
 * Thử năm âm lịch = solarYear và solarYear - 1 (vì tháng 11, 12 âm lịch thuộc năm trước).
 * Trả về Date object hoặc null.
 */
function lunarDayMonthToSolarInYear(lunarDay, lunarMonth, solarYear) {
    const candidates = [];
    for (const ly of [solarYear - 1, solarYear]) {
        const s = lunar2Solar(lunarDay, lunarMonth, ly, false);
        if (s) {
            const d = new Date(s.year, s.month - 1, s.day);
            if (d.getFullYear() === solarYear) candidates.push(d);
        }
        // Thử tháng nhuận
        const sLeap = lunar2Solar(lunarDay, lunarMonth, ly, true);
        if (sLeap) {
            const d = new Date(sLeap.year, sLeap.month - 1, sLeap.day);
            if (d.getFullYear() === solarYear) candidates.push(d);
        }
    }
    // Lấy cái gần nhất với đầu năm (bỏ trùng)
    const unique = candidates.filter((d, i, arr) =>
        arr.findIndex(x => x.getTime() === d.getTime()) === i
    );
    return unique.length ? unique[0] : null;
}

module.exports = { solar2Lunar, lunar2Solar, lunarDayMonthToSolarInYear };
