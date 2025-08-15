// Initialize timers with empty array
let timers = [];

// DOM Elements
const container = document.getElementById("timers");
const addTimerBtn = document.getElementById("addTimerBtn");
const importJsonBtn = document.getElementById("importJsonBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const timerForm = document.getElementById("timerForm");
const isHolidayCheckbox = document.getElementById("isHoliday");
const endDateGroup = document.getElementById("endDateGroup");

// Modals
const addTimerModal = document.getElementById("addTimerModal");
const jsonModal = document.getElementById("jsonModal");
const jsonModalTitle = document.getElementById("jsonModalTitle");
const jsonData = document.getElementById("jsonData");
const confirmJsonBtn = document.getElementById("confirmJsonBtn");

// Close buttons
document.querySelectorAll(".close").forEach(btn => {
  btn.addEventListener("click", () => {
    addTimerModal.style.display = "none";
    jsonModal.style.display = "none";
  });
});

// Modal controls
addTimerBtn.addEventListener("click", () => {
  addTimerModal.style.display = "block";
});

// Toggle end date fields when holiday checkbox changes
isHolidayCheckbox.addEventListener("change", () => {
  endDateGroup.style.display = isHolidayCheckbox.checked ? "block" : "none";
});

// Handle form submission
timerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const eventName = document.getElementById("eventName").value;
  const eventDate = document.getElementById("eventDate").value;
  const eventTime = document.getElementById("eventTime").value;
  const isHoliday = isHolidayCheckbox.checked;
  
  if (!eventName || !eventDate || !eventTime) {
    alert("Please fill in all fields");
    return;
  }
  
  const dateTimeString = `${eventDate}T${eventTime}:00`;
  
  if (isNaN(new Date(dateTimeString).getTime())) {
    alert("Invalid date/time combination");
    return;
  }
  
  // Get end date if it's a multi-day holiday
  let endDate = null;
  if (isHoliday && endDateGroup.style.display === "block") {
    const endDateInput = document.getElementById("endDate").value;
    const endTimeInput = document.getElementById("endTime").value;
    
    if (endDateInput) {
      endDate = `${endDateInput}T${endTimeInput || "23:59"}:00`;
    }
  }
  
  timers.push({ 
    event: eventName, 
    date: dateTimeString,
    endDate: endDate,
    isHoliday: isHoliday
  });
  saveTimers();
  renderTimers();
  
  timerForm.reset();
  isHolidayCheckbox.checked = false;
  endDateGroup.style.display = "none";
  addTimerModal.style.display = "none";
});

// Improved JSON Import Function
function importJsonData(jsonString) {
  try {
    // Parse the JSON string
    const importedTimers = JSON.parse(jsonString);
    
    // Validate the data structure
    if (!Array.isArray(importedTimers)) {
      throw new Error("Data must be an array of timer objects");
    }
    
    // Validate each timer object
    importedTimers.forEach(timer => {
      if (typeof timer !== 'object' || timer === null) {
        throw new Error("Each timer must be an object");
      }
      if (!timer.event || typeof timer.event !== 'string') {
        throw new Error("Each timer must have a string 'event' property");
      }
      if (!timer.date || typeof timer.date !== 'string') {
        throw new Error("Each timer must have a string 'date' property");
      }
      if (isNaN(new Date(timer.date).getTime())) {
        throw new Error(`Invalid date format for event: ${timer.event}`);
      }
      if (timer.endDate && isNaN(new Date(timer.endDate).getTime())) {
        throw new Error(`Invalid endDate format for event: ${timer.event}`);
      }
    });
    
    // Replace current timers with imported data
    timers = importedTimers;
    saveTimers();
    renderTimers();
    return true;
  } catch (error) {
    console.error("JSON Import Error:", error);
    alert(`Failed to import JSON: ${error.message}`);
    return false;
  }
}

// JSON Import Button
importJsonBtn.addEventListener("click", () => {
  jsonModalTitle.textContent = "Import JSON";
  jsonData.placeholder = 'Paste your JSON data here...\nExample:\n[\n  {\n    "event": "Event Name",\n    "date": "2025-01-01T00:00:00",\n    "isHoliday": false\n  }\n]';
  jsonData.value = "";
  jsonData.readOnly = false;
  jsonModal.style.display = "block";
});

// JSON Export Button
exportJsonBtn.addEventListener("click", () => {
  jsonModalTitle.textContent = "Export JSON";
  jsonData.value = JSON.stringify(timers, null, 2);
  jsonData.readOnly = true;
  jsonModal.style.display = "block";
});

// Confirm JSON Button
confirmJsonBtn.addEventListener("click", () => {
  if (jsonModalTitle.textContent === "Export JSON") {
    jsonModal.style.display = "none";
    return;
  }
  
  const jsonString = jsonData.value.trim();
  if (!jsonString) {
    alert("Please paste JSON data first");
    return;
  }
  
  if (importJsonData(jsonString)) {
    jsonModal.style.display = "none";
    jsonData.value = "";
  }
});

// Save timers to local storage
function saveTimers() {
  localStorage.setItem('timers', JSON.stringify(timers));
}

// Load timers from local storage
function loadTimers() {
  const savedTimers = localStorage.getItem('timers');
  if (savedTimers) {
    timers = JSON.parse(savedTimers);
  } else {
    // Load default holidays if no saved data exists
    loadDefaultHolidays();
  }
}

// Load default holidays
function loadDefaultHolidays() {
  const defaultHolidays = [
    // School events
    { event: "School Start", date: "2025-09-05T08:00:00", isHoliday: false },
    { event: "Final Exam", date: "2026-06-08T08:00:00", isHoliday: false },
    { event: "Mock Exam", date: "2026-05-01T08:00:00", isHoliday: false },
    
    // Holidays
    { event: "الفترة البينية الأولى (First Interterm)", date: "2025-10-19T00:00:00", endDate: "2025-10-26T23:59:59", isHoliday: true },
    { event: "عيد المولد النبوي الشريف (Prophet's Birthday)", date: "2025-09-04T00:00:00", isHoliday: true },
    { event: "ذكرى المسيرة الخضراء (Green March)", date: "2025-11-06T00:00:00", isHoliday: true },
    { event: "عيد الاستقلال (Independence Day)", date: "2025-11-18T00:00:00", isHoliday: true },
    { event: "الفترة البينية الثانية (Second Interterm)", date: "2025-12-07T00:00:00", endDate: "2025-12-14T23:59:59", isHoliday: true },
    { event: "فاتح السنة الميلادية (New Year's Day)", date: "2026-01-01T00:00:00", isHoliday: true },
    { event: "ذكرى تقديم وثيقة الاستقلال (Independence Manifesto)", date: "2026-01-11T00:00:00", isHoliday: true },
    { event: "عطلة رأس السنة الأمازيغية (Amazigh New Year)", date: "2026-01-14T00:00:00", isHoliday: true },
    { event: "عطلة منتصف السنة الدراسية (Mid-Year Break)", date: "2026-01-25T00:00:00", endDate: "2026-02-08T23:59:59", isHoliday: true },
    { event: "الفترة البينية الثالثة (Third Interterm)", date: "2026-03-15T00:00:00", endDate: "2026-03-22T23:59:59", isHoliday: true },
    { event: "عيد الفطر (Eid al-Fitr)", date: "2026-03-18T00:00:00", isHoliday: true },
    { event: "عيد الشغل (Labor Day)", date: "2026-05-01T00:00:00", isHoliday: true },
    { event: "الفترة البينية الرابعة (Fourth Interterm)", date: "2026-05-03T00:00:00", endDate: "2026-05-10T23:59:59", isHoliday: true },
    { event: "عيد الأضحى (Eid al-Adha)", date: "2026-06-06T00:00:00", endDate: "2026-06-08T23:59:59", isHoliday: true },
    { event: "فاتح محرم (Islamic New Year)", date: "2026-06-16T00:00:00", isHoliday: true }
  ];
  
  timers = defaultHolidays;
  saveTimers();
}

// Render all timers
function renderTimers() {
  container.innerHTML = "";
  if (timers.length === 0) {
    container.innerHTML = '<div class="empty-state">No timers yet. Add one to get started!</div>';
    return;
  }
  
  // Sort timers by date (earliest first)
  timers.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  timers.forEach((timer, index) => {
    const el = document.createElement("div");
    el.className = "timer";
    if (timer.isHoliday) {
      el.classList.add("holiday");
    }
    
    // For multi-day events, show the date range
    const dateText = timer.endDate 
      ? `${formatDate(new Date(timer.date))} - ${formatDate(new Date(timer.endDate))}`
      : formatDateTime(new Date(timer.date));
    
    el.innerHTML = `
      <div class="event-name">${timer.event}</div>
      <div class="date">${dateText}</div>
      <div class="time" id="time-${index}">
        <div class="unit"><span>--</span>Days</div>
        <div class="unit"><span>--</span>Hrs</div>
        <div class="unit"><span>--</span>Min</div>
        <div class="unit"><span>--</span>Sec</div>
      </div>
      <div class="btns">
        <button class="edit-btn" onclick="editTimer(${index})">Edit</button>
        <button class="delete-btn" onclick="removeTimer(${index})">Remove</button>
      </div>
    `;
    container.appendChild(el);
  });
}

// Format date for display (without time)
function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format date with time for display
function formatDateTime(date) {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Update timer displays
function updateTimers() {
  const now = new Date();
  
  timers.forEach((timer, index) => {
    const end = new Date(timer.date);
    const diff = end - now;
    
    // For multi-day holidays that haven't started yet, use the start date
    let displayEnd = end;
    if (timer.endDate && diff > 0) {
      displayEnd = end; // Countdown to start of holiday
    } else if (timer.endDate && diff <= 0) {
      displayEnd = new Date(timer.endDate); // Countdown to end of holiday
    }
    
    const displayDiff = displayEnd - now;
    const t = {
      days: Math.max(0, Math.floor(displayDiff / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((displayDiff / (1000 * 60 * 60)) % 24)),
      minutes: Math.max(0, Math.floor((displayDiff / (1000 * 60)) % 60)),
      seconds: Math.max(0, Math.floor((displayDiff / 1000) % 60))
    };

    const timerEl = document.querySelectorAll(".timer")[index];
    if (!timerEl) return;
    
    const timeEl = document.getElementById(`time-${index}`);
    
    if (timer.endDate && now >= new Date(timer.date) && now <= new Date(timer.endDate)) {
      // Currently in a multi-day holiday period
      timerEl.classList.add("holiday");
      timeEl.innerHTML = `<div class="unit"><span>NOW</span>Happening</div>`;
    } else if (displayDiff <= 0) {
      // Event has passed
      timerEl.classList.add("ended");
      if (timer.isHoliday) {
        timeEl.innerHTML = `<div class="unit"><span>0</span>Passed</div>`;
      } else {
        timeEl.innerHTML = `<div class="unit"><span>0</span>Done</div>`;
      }
    } else {
      // Event is upcoming
      if (timer.isHoliday) {
        timerEl.classList.add("holiday");
        timerEl.classList.remove("ended");
      }
      timeEl.innerHTML = `
        <div class="unit"><span>${t.days}</span>Days</div>
        <div class="unit"><span>${t.hours}</span>Hrs</div>
        <div class="unit"><span>${t.minutes}</span>Min</div>
        <div class="unit"><span>${t.seconds}</span>Sec</div>
      `;
    }
  });
}

// Remove a timer
function removeTimer(index) {
  if (confirm(`Are you sure you want to remove "${timers[index].event}"?`)) {
    timers.splice(index, 1);
    saveTimers();
    renderTimers();
  }
}

// Edit a timer
function editTimer(index) {
  const timer = timers[index];
  const dateObj = new Date(timer.date);
  
  // Format date and time for input fields
  const dateStr = dateObj.toISOString().split('T')[0];
  const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
  
  // Show modal with current values
  document.getElementById("eventName").value = timer.event;
  document.getElementById("eventDate").value = dateStr;
  document.getElementById("eventTime").value = timeStr;
  isHolidayCheckbox.checked = timer.isHoliday;
  
  // Show end date fields if applicable
  if (timer.endDate) {
    const endDateObj = new Date(timer.endDate);
    const endDateStr = endDateObj.toISOString().split('T')[0];
    const endTimeStr = `${String(endDateObj.getHours()).padStart(2, '0')}:${String(endDateObj.getMinutes()).padStart(2, '0')}`;
    
    document.getElementById("endDate").value = endDateStr;
    document.getElementById("endTime").value = endTimeStr;
    endDateGroup.style.display = "block";
  } else {
    endDateGroup.style.display = "none";
  }
  
  addTimerModal.style.display = "block";
  
  // Temporarily change form to edit mode
  timerForm.onsubmit = function(e) {
    e.preventDefault();
    
    const eventName = document.getElementById("eventName").value;
    const eventDate = document.getElementById("eventDate").value;
    const eventTime = document.getElementById("eventTime").value;
    const isHoliday = isHolidayCheckbox.checked;
    
    if (!eventName || !eventDate || !eventTime) {
      alert("Please fill in all fields");
      return;
    }
    
    const dateTimeString = `${eventDate}T${eventTime}:00`;
    
    if (isNaN(new Date(dateTimeString).getTime())) {
      alert("Invalid date/time combination");
      return;
    }
    
    // Get end date if it's a multi-day holiday
    let endDate = null;
    if (isHoliday && endDateGroup.style.display === "block") {
      const endDateInput = document.getElementById("endDate").value;
      const endTimeInput = document.getElementById("endTime").value;
      
      if (endDateInput) {
        endDate = `${endDateInput}T${endTimeInput || "23:59"}:00`;
      }
    }
    
    // Update the timer
    timers[index] = { 
      event: eventName, 
      date: dateTimeString,
      endDate: endDate,
      isHoliday: isHoliday
    };
    
    saveTimers();
    renderTimers();
    
    // Reset form and close modal
    timerForm.reset();
    isHolidayCheckbox.checked = false;
    endDateGroup.style.display = "none";
    addTimerModal.style.display = "none";
    timerForm.onsubmit = arguments.callee; // Restore original handler
  };
}

// Initialize the app
function init() {
  loadTimers();
  renderTimers();
  setInterval(updateTimers, 1000);
}

// Start the application
init();