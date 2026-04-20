feather.replace();

// ==========================================
// 時間表示処理
// ==========================================
const dateDisplay = document.getElementById('date-display');
const hourDisplay = document.getElementById('hour-display');
const minuteDisplay = document.getElementById('minute-display');
const secondDisplay = document.getElementById('second-display');

const days = ['日', '月', '火', '水', '木', '金', '土'];

function updateTime() {
    const now = new Date();

    // Format Date: MM月DD日(曜)
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    dateDisplay.textContent = `${month}月${date}日(${day})`;

    // Format Time: HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    if (hourDisplay && minuteDisplay && secondDisplay) {
        hourDisplay.textContent = hours;
        minuteDisplay.textContent = minutes;
        secondDisplay.textContent = seconds;
    }
}

// ==========================================
// 天気情報の取得
// ==========================================
async function fetchWeather() {
    try {
        const response = await fetch('/api/weather');
        if (!response.ok) throw new Error('API request failed');

        const json = await response.json();
        const data = json.data;

        // Update DOM
        document.getElementById('temperature-display').textContent = data.temperature;
        document.getElementById('condition-display').textContent = data.condition;

        if (document.getElementById('humidity-display') && data.humidity !== undefined) {
            document.getElementById('humidity-display').textContent = data.humidity;
        }

        const weatherContent = document.querySelector('.weather-content');

        const oldIcon = document.getElementById('weather-icon') || document.querySelector('.weather-content svg') || document.querySelector('.weather-content img');

        let newIcon = document.createElement('img');
        newIcon.setAttribute('id', 'weather-icon');
        if (data.icon) {
            newIcon.setAttribute('src', data.icon);
        }
        newIcon.setAttribute('class', 'icon-large');
        newIcon.setAttribute('alt', data.condition || 'Weather Icon');

        if (oldIcon) {
            weatherContent.replaceChild(newIcon, oldIcon);
        } else {
            weatherContent.insertBefore(newIcon, weatherContent.firstChild);
        }

    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// ==========================================
// 3時間天気予想
// ==========================================
async function updateForecast() {
    try {
        const response = await fetch('/api/forecast');
        if (!response.ok) throw new Error('API request failed');

        const json = await response.json();
        const data = json.data;

        const container = document.getElementById('forecast-container');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < 4; i++) {

            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';

            forecastItem.innerHTML = `
                <div class="forecast-time">${data[i].hour}</div>
                <img src="${data[i].icon}" class="forecast-icon" alt="forecast icon" />
                <div class="forecast-temp">${data[i].temp}°C</div>
                <div class="forecast-humidity">${data[i].humidity}%</div>
                <div class="forecast-pop"><i data-feather="umbrella" class="pop-icon"></i> ${data[i].pop}%</div>
            `;
            container.appendChild(forecastItem);
        }
        feather.replace();
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// ==========================================
// 為替取得
// ==========================================
async function updateRate() {
    try {
        const response = await fetch('/api/rate');
        if (!response.ok) throw new Error('API request failed');

        const json = await response.json();
        const data = json.data;

        if (document.getElementById('exchange-rate-display') && data.exchange_rate !== undefined) {
            document.getElementById('exchange-rate-display').textContent = data.exchange_rate.toFixed(2);

            // 値動きの表示
            const changeDisplay = document.getElementById('exchange-change-display');
            if (changeDisplay && data.exchange_diff !== undefined) {
                const changeVal = data.exchange_diff;
                const sign = changeVal > 0 ? '+' : '';
                changeDisplay.textContent = `${sign}${changeVal.toFixed(2)}`;

                // 色クラスの付与（一度リセットしてから）
                changeDisplay.className = 'currency-change';
                if (changeVal > 0) {
                    changeDisplay.classList.add('positive');
                } else if (changeVal < 0) {
                    changeDisplay.classList.add('negative');
                }
            }
        }

    } catch (error) {
        console.error('Error fetching rate:', error);
    }
}

// ==========================================
// カレンダー
// ==========================================
function updateCalendar() {
    const calendarContainer = document.getElementById('calendar-container');
    const calendarTitle = document.getElementById('calendar-title');
    if (!calendarContainer || !calendarTitle) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    calendarTitle.textContent = `${year}年${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let tableHtml = '<table class="calendar-table">';
    tableHtml += '<thead><tr><th class="sun">日</th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th class="sat">土</th></tr></thead>';
    tableHtml += '<tbody><tr>';

    for (let i = 0; i < firstDay; i++) {
        tableHtml += '<td></td>';
    }

    let currentDayOfWeek = firstDay;
    for (let day = 1; day <= daysInMonth; day++) {
        if (currentDayOfWeek === 7) {
            tableHtml += '</tr><tr>';
            currentDayOfWeek = 0;
        }

        const isToday = (day === today) ? ' class="today"' : '';
        const isSun = (currentDayOfWeek === 0) ? ' class="sun"' : '';
        const isSat = (currentDayOfWeek === 6) ? ' class="sat"' : '';

        let classes = [];
        if (day === today) classes.push('today');
        else if (currentDayOfWeek === 0) classes.push('sun');
        else if (currentDayOfWeek === 6) classes.push('sat');

        let classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';

        tableHtml += `<td${classStr}><span>${day}</span></td>`;
        currentDayOfWeek++;
    }

    while (currentDayOfWeek < 7 && currentDayOfWeek > 0) {
        tableHtml += '<td></td>';
        currentDayOfWeek++;
    }

    tableHtml += '</tr></tbody></table>';
    calendarContainer.innerHTML = tableHtml;
}

// ==========================================
// 初期化と実施間隔定義
// ==========================================

// 時間
updateTime();
setInterval(updateTime, 1000);
// 天気
fetchWeather();
setInterval(fetchWeather, 60 * 60 * 1000);
// 3時間ごと天気
updateForecast();
setInterval(updateForecast, 60 * 60 * 1000);
// 為替価格
updateRate();
setInterval(updateRate, 60 * 60 * 1000);
// カレンダー
updateCalendar();
setInterval(updateCalendar, 60 * 60 * 1000);
