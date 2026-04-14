// Initialize Feather icons
feather.replace();

// ==========================================
// Time Update Logic
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
// Weather Update Logic
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
        
        // Update Icon parent container safely (since feather.replace replaces the original <i> tag with <svg>)
        const weatherContent = document.querySelector('.weather-content');
        
        // Find existing svg OR i tag to replace
        const oldIcon = document.getElementById('weather-icon') || document.querySelector('.weather-content svg');
        
        const newIcon = document.createElement('i');
        newIcon.setAttribute('id', 'weather-icon');
        newIcon.setAttribute('data-feather', data.icon);
        newIcon.setAttribute('class', 'icon-large');
        newIcon.style.color = data.color;

        if (oldIcon) {
            weatherContent.replaceChild(newIcon, oldIcon);
        } else {
            weatherContent.insertBefore(newIcon, weatherContent.firstChild);
        }
        
        // Re-render feather icon for the newly created <i> tag
        feather.replace();
        
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// ==========================================
// Initialization & Intervals
// ==========================================

// Run time update immediately and then every second
updateTime();
setInterval(updateTime, 1000);

// Run weather fetch immediately and then every 10 seconds for demo purposes
// In production, this interval should be around 10-30 minutes depending on the API limits.
fetchWeather();
setInterval(fetchWeather, 10000);

// ==========================================
// Dummy Forecast Logic
// ==========================================
function updateForecast() {
    const container = document.getElementById('forecast-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const now = new Date();
    let currentHour = now.getHours();
    
    // next 3-hour interval (e.g. if 10:00 -> 12:00)
    let nextForecastHour = Math.ceil((currentHour + 1) / 3) * 3;
    
    // Dummy condition patterns
    const dummyConditions = [
        { icon: 'sun', temp: 22, pop: 10, color: '#f59e0b' },
        { icon: 'cloud', temp: 20, pop: 30, color: '#6b7280' },
        { icon: 'cloud-rain', temp: 18, pop: 60, color: '#3b82f6' },
        { icon: 'sun', temp: 24, pop: 0, color: '#f59e0b' }
    ];

    for (let i = 0; i < 4; i++) {
        let hour = (nextForecastHour + (i * 3)) % 24;
        let dummy = dummyConditions[i % dummyConditions.length];
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        forecastItem.innerHTML = `
            <div class="forecast-time">${String(hour).padStart(2, '0')}:00</div>
            <i data-feather="${dummy.icon}" class="forecast-icon" style="color: ${dummy.color}"></i>
            <div class="forecast-temp">${dummy.temp}°C</div>
            <div class="forecast-pop"><i data-feather="umbrella" class="pop-icon"></i> ${dummy.pop}%</div>
        `;
        container.appendChild(forecastItem);
    }
    feather.replace();
}

updateForecast();
// Update forecast every hour to keep times relatively accurate
setInterval(updateForecast, 60 * 60 * 1000);
