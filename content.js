// content.js

(() => {
  // Bilgi Kutusunun ID'si
  const INFO_CONTAINER_ID = 'hyperactive-time-info-container';
  const CHART_ICON_ID = 'hyperactive-time-chart-icon';
  const CHART_MODAL_ID = 'hyperactive-time-chart-modal';
  const CHART_CANVAS_ID = 'hyperactive-time-chart-canvas';

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

  // Çizgi Grafik Çizim Fonksiyonu
  const drawChart = (monthlyData, averageHours) => {
    // Modal İçeriğini Oluşturma
    const existingModal = document.getElementById(CHART_MODAL_ID);
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = CHART_MODAL_ID;
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '84px';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '10000';

    const modalContent = document.createElement('div');
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.backgroundColor = '#fff';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '20px';
    modalContent.style.position = 'relative';

    // Kapatma Butonu
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '20px';
    closeButton.style.fontSize = '30px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#aaa';
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.color = '#000';
    });
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.color = '#aaa';
    });
    closeButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Başlık
    const title = document.createElement('h2');
    title.textContent = 'Çalışma Saatleri Grafiği';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.id = CHART_CANVAS_ID;
    canvas.width = 700;
    canvas.height = 400;

    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(canvas);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Chart.js ile Grafik Oluşturma
    const ctx = canvas.getContext('2d');

    const labels = monthlyData.map(data => data.month);
    const dataValues = monthlyData.map(data => parseFloat(data.hours));

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Çalışma Saatleri',
            data: dataValues,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgb(54, 162, 235)',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#007BFF',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#007BFF',
          },
          {
            label: 'Ortalama Çalışma Saatleri',
            data: Array(dataValues.length).fill(averageHours),
            borderColor: 'rgb(255, 55, 132)', 
            backgroundColor: 'rgb(255, 55, 132,0)',
            borderDash: [10, 5],
            fill: false,
            tension: 0.4,
          },
          {
            label: 'Hedef Saat',
            data: Array(dataValues.length).fill(110),
            borderColor: 'rgb(143, 190, 0)', // İstediğiniz renge göre ayarlayabilirsiniz
            backgroundColor: 'rgb(143, 190, 0,0)',
            fill: false,
            tension: 0.4,
            borderDash: [5, 5], // Kesikli çizgi için
          }
          
        ]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y} saat`;
              }
            }
          },
          legend: {
            display: true,
            position: 'top',
          },
          datalabels: {
            backgroundColor: function(context) {
              return context.dataset.backgroundColor;
            },
            borderRadius: 4,
            color: 'white',
            font: {
              weight: 'bold'
            },
            formatter: Math.round,
            padding: 6
          },
        },
        layout: {
          padding: {
            top: 32,
            right: 16,
            bottom: 16,
            left: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Çalışma Saatleri (saat)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Aylar'
            }
          }
        }
      },
      plugins: [ChartDataLabels] // Plugin’i ekleyin (Opsiyonel)
    });
  };

  // Bilgi Kutusunu ve Grafik İkonunu Oluşturma
  const createInfoAndIconContainer = () => {
    // Eğer zaten mevcutsa, tekrar oluşturma
    if (document.getElementById(INFO_CONTAINER_ID)) return;

    const infoContainer = document.createElement('div');
    infoContainer.id = INFO_CONTAINER_ID;
    infoContainer.style.position = 'absolute';
    infoContainer.style.top = '-5px';
    infoContainer.style.left = '10px';
    infoContainer.style.padding = '10px';
    infoContainer.style.borderRadius = '5px';
    infoContainer.style.display = 'flex';
    infoContainer.style.gap = '12px';
    infoContainer.style.color = '#7367f0';
    infoContainer.style.zIndex = '1000';
    // Bilgi İçeriği
    const infoHTML = `
      <p><strong>Bu Ay:</strong> Yükleniyor...</p>
      <p><strong>Geçen Ay:</strong> Yükleniyor...</p>
      <p><strong>Geçmiş Ayların Ortalaması:</strong> Yükleniyor...</p>
    `;
    infoContainer.innerHTML = infoHTML;

    // Grafik İkonu (SVG Kullanarak)
    const chartIcon = document.createElement('div');
    chartIcon.id = CHART_ICON_ID;
    chartIcon.innerHTML = `
    <svg viewBox="64 64 896 896" focusable="false" data-icon="bar-chart" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M888 792H200V168c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v688c0 4.4 3.6 8 8 8h752c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm-600-80h56c4.4 0 8-3.6 8-8V560c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v144c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V384c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v320c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V462c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v242c0 4.4 3.6 8 8 8zm152 0h56c4.4 0 8-3.6 8-8V304c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v400c0 4.4 3.6 8 8 8z"></path></svg>
    `;
   
    chartIcon.style.position = 'fixed';
    chartIcon.style.top = '5px';
    chartIcon.style.right = '10px';
    chartIcon.style.width = '24px';
    chartIcon.style.height = '24px';
    chartIcon.style.cursor = 'pointer';
    chartIcon.style.zIndex = '1000';
    chartIcon.style.display= "flex";
    chartIcon.style.justifyContent= "center";
    chartIcon.style.alignItems= "center";
    chartIcon.style.color= "white";
    chartIcon.style.borderRadius= "60px";
    chartIcon.style.background= "#4839eb";
    chartIcon.title = 'Grafiği Göster';

    // Event Listener Ekleme
    chartIcon.addEventListener('click', () => {
      const average = parseFloat(infoContainer.getAttribute('data-average'));
      const monthlyData = JSON.parse(infoContainer.getAttribute('data-monthly'));
      drawChart(monthlyData, average);
    });

    document.querySelector('.timesheet-card').closest('.content-wrapper').appendChild(infoContainer);
    document.body.appendChild(chartIcon);
  };

  // Bilgi Kutusunu Güncelleme Fonksiyonu
  const updateInfoContainer = async () => {
    const infoContainer = document.getElementById(INFO_CONTAINER_ID);
    if (!infoContainer) {
      console.error("Bilgi kutusu bulunamadı.");
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
    const averageHours = (averagePastBillable / 60).toFixed(2);

    // Bilgi Kutusunu Güncelleme
    infoContainer.innerHTML = `
      <p><strong>Bu Ay:</strong> ${convertMinutesToHours(currentBillable)}</p>
      <p><strong>Geçen Ay:</strong> ${convertMinutesToHours(previousBillable)}</p>
      <p><strong>Geçmiş Ayların Ortalaması:</strong> ${convertMinutesToHours(Math.round(averagePastBillable))}</p>
    `;

    // Son bir yılın çalışma saatlerini al
    const lastYearRanges = getAllFullMonthsSince(new Date().getFullYear() - 1, new Date().getMonth() + 1); // Son 12 ay
    const monthlyData = [];

    for (const [start, end] of lastYearRanges) {
      const billable = await fetchBillableTime(start, end);
      const date = new Date(start);
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyData.push({
        month: monthName,
        hours: (billable / 60).toFixed(2) // Saat cinsinden
      });
    }

    // Bilgileri Modal İçin Saklama
    infoContainer.setAttribute('data-average', averageHours);
    infoContainer.setAttribute('data-monthly', JSON.stringify(monthlyData));
  };

  // Bilgi Kutusunu Ekleme Fonksiyonu
  const addInfoContainer = async () => {
    // Bilgi Kutusunu ve İkonu Oluştur
    createInfoAndIconContainer();

    // Bilgi Kutusunu Güncelle
    await updateInfoContainer();
  };

  // Bilgi Kutusunu Kaldırma Fonksiyonu
  const removeInfoContainer = () => {
    const infoContainer = document.getElementById(INFO_CONTAINER_ID);
    if (infoContainer && infoContainer.parentNode) {
      infoContainer.parentNode.removeChild(infoContainer);
    }

    const chartIcon = document.getElementById(CHART_ICON_ID);
    if (chartIcon && chartIcon.parentNode) {
      chartIcon.parentNode.removeChild(chartIcon);
    }

    const modal = document.getElementById(CHART_MODAL_ID);
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  addInfoContainer();
  // URL Takip Fonksiyonu
  // const trackURL = () => {
  //   const currentPath = window.location.pathname;

  //   if (currentPath === '/time') {
  //     // /time sayfasındayken bilgi kutusunu ekle
  //     addInfoContainer();
  //   } else {
  //     // /time sayfasında değilken bilgi kutusunu kaldır
  //     removeInfoContainer();
  //   }
  // };

  // // İlk Kontrol
  // trackURL();

  // // Interval ile URL'yi Takip Et
  // setInterval(trackURL, CHECK_INTERVAL);
})();
