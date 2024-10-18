// content.js

(() => {
    // Bilgi Kutusunun ID'si
    const INFO_CONTAINER_ID = 'hyperactive-time-info-container';
  
    // Interval Süresi (ms)
    const CHECK_INTERVAL = 1000; // 1 saniye
  
    // Yardımcı Fonksiyonlar
    const getUnixTimestamps = (year, month, dayStart, dayEnd) => {
      const startDate = new Date(year, month, dayStart);
      const endDate = new Date(year, month, dayEnd, 23, 59, 59, 999);
      return [startDate.getTime(), endDate.getTime()];
    };
  
    const fetchBillableTime = async (start, end) => {
      try {
        const response = await fetch("https://hyperactive.pro/api/reports/v2", {
          "headers": {
            "accept": "application/json",
            "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "authorization": `Bearer ${localStorage.getItem('user')}`,
            "content-type": "application/json",
            "priority": "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          },
          "referrer": "https://hyperactive.pro/admin/reports/",
          "referrerPolicy": "strict-origin-when-cross-origin",
          "body": JSON.stringify({
            "clients": [],
            "departments": [],
            "projects": [],
            "tasks": [],
            "dates": [start, end],
            "users": [],
            "userTitles": [],
            "groupId": 0
          }),
          "method": "POST",
          "mode": "cors",
          "credentials": "include"
        });
  
        const data = await response.json();
        let totalBillable = 0;
  
        if (data.success && Array.isArray(data.data)) {
          data.data.forEach(client => {
            totalBillable += parseInt(client.billable_time, 10);
          });
        }
  
        return totalBillable; // Dakika cinsinden
      } catch (error) {
        console.error("Fetch hatası:", error);
        return 0;
      }
    };
  
    const convertMinutesToHours = (minutes) => {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs} saat ${mins} dakika`;
    };
  
    // Tarih Hesaplama Fonksiyonları
    const getCurrentMonthRange = () => {
      const now = new Date();
      return getUnixTimestamps(now.getFullYear(), now.getMonth(), 1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    };
  
    const getPreviousMonthRange = () => {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return getUnixTimestamps(prevMonth.getFullYear(), prevMonth.getMonth(), 1, new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate());
    };
  
    const getAllFullMonthsSince = (startYear, startMonth) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
  
      let months = [];
      let year = startYear;
      let month = startMonth;
  
      while (year < currentYear || (year === currentYear && month < currentMonth)) {
        const endDay = new Date(year, month + 1, 0).getDate();
        months.push(getUnixTimestamps(year, month, 1, endDay));
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
      }
  
      return months;
    };
  
    // Bilgi Kutusunu Oluşturma
    const createInfoContainer = () => {
      // Eğer zaten mevcutsa, tekrar oluşturma
      if (document.getElementById(INFO_CONTAINER_ID)) return;
  
      const infoContainer = document.createElement('div');
      infoContainer.id = INFO_CONTAINER_ID;
      infoContainer.style.position = 'absolute';
      infoContainer.style.top = '-4px';
      infoContainer.style.display = 'flex';
      infoContainer.style.left = '10px';
      // infoContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // Yorum satırında bırakıldı
      infoContainer.style.padding = '10px';
      infoContainer.style.borderRadius = '5px';
      // infoContainer.style.boxShadow = 'rgba(0, 0, 0, 0.1) 0px 0px 10px'; // Yorum satırında bırakıldı
      infoContainer.style.gap = '12px';
      infoContainer.style.color = 'red';
      infoContainer.style.zIndex = '1000';
  
      infoContainer.innerHTML = `
        <p><strong>Bu Ay:</strong> Yükleniyor...</p>
        <p><strong>Geçen Ay:</strong> Yükleniyor...</p>
        <p><strong>Geçmiş Ayların Ortalaması:</strong> Yükleniyor...</p>
      `;
  
      return infoContainer;
    };
  
    // Bilgi Kutusunu Güncelleme
    const updateInfoContainer = async () => {
      const targetElement = document.querySelector('.timesheet-card.card')?.closest('.content-wrapper');
  
      if (!targetElement) {
        console.error("Hedef element bulunamadı.");
        return;
      }
  
      const [currentStart, currentEnd] = getCurrentMonthRange();
      const [prevStart, prevEnd] = getPreviousMonthRange();
      const allMonthsRanges = getAllFullMonthsSince(2023, 2); // Mart 2023 (0: Ocak)
  
      // Verileri Getirme
      const currentBillable = await fetchBillableTime(currentStart, currentEnd);
      const previousBillable = await fetchBillableTime(prevStart, prevEnd);
  
      // Geçmiş Ayların Ortalamaını Hesaplama
      let totalPastBillable = 0;
      for (const [start, end] of allMonthsRanges) {
        totalPastBillable += await fetchBillableTime(start, end);
      }
      const averagePastBillable = allMonthsRanges.length > 0 ? totalPastBillable / allMonthsRanges.length : 0;
  
      // Bilgi Kutusunu Bulma
      const infoContainer = document.getElementById(INFO_CONTAINER_ID);
      if (infoContainer) {
        infoContainer.innerHTML = `
          <p><strong>Bu Ay:</strong> ${convertMinutesToHours(currentBillable)}</p>
          <p><strong>Geçen Ay:</strong> ${convertMinutesToHours(previousBillable)}</p>
          <p><strong>Geçmiş Ayların Ortalaması:</strong> ${convertMinutesToHours(Math.round(averagePastBillable))}</p>
        `;
      }
    };
  
    // Bilgi Kutusunu Ekleme
    const addInfoContainer = async () => {
      const targetElement = document.querySelector('.timesheet-card.card')?.closest('.content-wrapper');
  
      if (!targetElement) {
        console.error("Hedef element bulunamadı.");
        return;
      }
  
      // Bilgi Kutusunu Oluştur
      const infoContainer = createInfoContainer();
      if (!infoContainer) return;
  
      // Bilgiyi DOM'a Ekleme
      targetElement.style.position = 'relative'; // Konteynerin konumunu ayarla
      targetElement.insertBefore(infoContainer, targetElement.firstChild);
  
      // Verileri Güncelle
      await updateInfoContainer();
    };
  
    // Bilgi Kutusunu Kaldırma
    const removeInfoContainer = () => {
      const infoContainer = document.getElementById(INFO_CONTAINER_ID);
      if (infoContainer && infoContainer.parentNode) {
        infoContainer.parentNode.removeChild(infoContainer);
      }
    };
  
    // URL Takip Fonksiyonu
    const trackURL = () => {
      const currentPath = window.location.pathname;
  
      if (currentPath === '/time') {
        // /time sayfasındayken bilgi kutusunu ekle
        addInfoContainer();
      } else {
        // /time sayfasında değilken bilgi kutusunu kaldır
        removeInfoContainer();
      }
    };
  
    // İlk Kontrol
    trackURL();
  
    // Interval ile URL'yi Takip Et
    setInterval(trackURL, CHECK_INTERVAL);
  })();
  