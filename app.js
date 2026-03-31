const modalEl = document.getElementById("status-modal");
const modalTitleEl = document.getElementById("modal-title");
const modalMessageEl = document.getElementById("modal-message");
const modalOkBtn = document.getElementById("modal-ok-btn");

const pointsEl = document.getElementById("points");
const habitListEl = document.getElementById("habit-list");
const rewardListEl = document.getElementById("reward-list");
const recordListEl = document.getElementById("record-list");
const statusEl = document.getElementById("status");

const habitNameInput = document.getElementById("habit-name-input");
const habitScoreInput = document.getElementById("habit-score-input");
const addHabitBtn = document.getElementById("add-habit-btn");

const habitRuleTypeSelect = document.getElementById("habit-rule-type");
const dailyRuleBox = document.getElementById("daily-rule-box");
const weeklyRuleBox = document.getElementById("weekly-rule-box");
const intervalRuleBox = document.getElementById("interval-rule-box");

const weekdayCheckboxes = document.querySelectorAll('#weekday-group input[type="checkbox"]');
const dailyTimesInput = document.getElementById("daily-times-input");
const weeklyTimesInput = document.getElementById("weekly-times-input");
const intervalDaysInput = document.getElementById("interval-days-input");

const rewardNameInput = document.getElementById("reward-name-input");
const rewardCostInput = document.getElementById("reward-cost-input");
const addRewardBtn = document.getElementById("add-reward-btn");


let appData = null;

function closeModal() {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  delete modalEl.dataset.type;
}

function showModal(message, title = "提示", type = "info") {
  if (!modalEl || !modalTitleEl || !modalMessageEl) {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  modalTitleEl.textContent = title;
  modalMessageEl.textContent = message;
  modalEl.classList.remove("hidden");
  modalEl.dataset.type = type;
}

function setStatus(message, options = {}) {
  const { modal = false, title = "提示", type = "info" } = options;

  if (statusEl) {
    statusEl.textContent = message;
  }

  if (modal) {
    showModal(message, title, type);
  }
}

if (modalOkBtn) {
  modalOkBtn.addEventListener("click", closeModal);
}

async function fetchData() {
  const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/data`, {
    method: "GET",
    headers: {
      "x-app-key": window.APP_CONFIG.APP_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`读取失败：${response.status}`);
  }

  return await response.json();
}

async function saveData(data) {
  const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-key": window.APP_CONFIG.APP_KEY
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`保存失败：${response.status}`);
  }

  return await response.json();
}

function formatTime(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hour}:${minute}`;
}

function createHabitId(name) {
  return `habit_${Date.now()}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
}

function createRewardId(name) {
  return `reward_${Date.now()}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
}

function createRecordId() {
  return `record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getWeekdayNumber(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const weekday = getWeekdayNumber(d);
  const monday = new Date(d);
  monday.setDate(d.getDate() - (weekday - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function getHabitRecords(habitId) {
  if (!Array.isArray(appData.records)) return [];
  return appData.records.filter(
    (record) => record.type === "habit" && record.habitId === habitId
  );
}

function countHabitRecordsOnDate(habitId, date = new Date()) {
  const targetDateKey = getDateKey(date);
  return getHabitRecords(habitId).filter((record) => {
    const recordDate = new Date(record.time);
    return getDateKey(recordDate) === targetDateKey;
  }).length;
}

function countHabitRecordsThisWeek(habitId, date = new Date()) {
  const { monday, sunday } = getWeekRange(date);

  return getHabitRecords(habitId).filter((record) => {
    const recordDate = new Date(record.time);
    return recordDate >= monday && recordDate <= sunday;
  }).length;
}

function getLatestHabitRecord(habitId) {
  const records = getHabitRecords(habitId);
  if (records.length === 0) return null;

  return records.reduce((latest, current) => {
    return new Date(current.time) > new Date(latest.time) ? current : latest;
  });
}

function diffDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const ms = end - start;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function normalizeHabitRule(habit) {
  if (!habit.rule) {
    return {
      type: "daily",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      timesPerDay: 1
    };
  }

  if (habit.rule.type === "daily") {
    return {
      type: "daily",
      weekdays: Array.isArray(habit.rule.weekdays) ? habit.rule.weekdays : [1, 2, 3, 4, 5, 6, 7],
      timesPerDay: Number(habit.rule.timesPerDay) > 0 ? Number(habit.rule.timesPerDay) : 1
    };
  }

  if (habit.rule.type === "weekly") {
    return {
      type: "weekly",
      timesPerWeek: Number(habit.rule.timesPerWeek) > 0 ? Number(habit.rule.timesPerWeek) : 1
    };
  }

  if (habit.rule.type === "interval") {
    return {
      type: "interval",
      intervalDays: Number(habit.rule.intervalDays) > 0 ? Number(habit.rule.intervalDays) : 1
    };
  }

  return {
    type: "daily",
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    timesPerDay: 1
  };
}

function getRuleText(habit) {
  const rule = normalizeHabitRule(habit);

  if (rule.type === "daily") {
    const weekdayMap = {
      1: "一",
      2: "二",
      3: "三",
      4: "四",
      5: "五",
      6: "六",
      7: "日"
    };

    const weekdaysText = (rule.weekdays || [])
      .map((day) => `周${weekdayMap[day]}`)
      .join("、");

    return `每日规则：${weekdaysText}；每天最多 ${rule.timesPerDay} 次`;
  }

  if (rule.type === "weekly") {
    return `每周规则：每周最多 ${rule.timesPerWeek} 次`;
  }

  if (rule.type === "interval") {
    return `间隔规则：至少间隔 ${rule.intervalDays} 天`;
  }

  return "未设置规则";
}

function canCompleteHabit(habit) {
  const now = new Date();
  const rule = normalizeHabitRule(habit);

  if (rule.type === "daily") {
    const todayWeekday = getWeekdayNumber(now);

    if (!rule.weekdays.includes(todayWeekday)) {
      return {
        allowed: false,
        message: "今天不在这个习惯的可打卡日期内"
      };
    }

    const todayCount = countHabitRecordsOnDate(habit.id, now);
    if (todayCount >= rule.timesPerDay) {
      return {
        allowed: false,
        message: `今天已完成 ${todayCount} 次，已达到上限`
      };
    }

    return {
      allowed: true,
      message: "今日可打卡"
    };
  }

  if (rule.type === "weekly") {
    const weekCount = countHabitRecordsThisWeek(habit.id, now);
    if (weekCount >= rule.timesPerWeek) {
      return {
        allowed: false,
        message: `本周已完成 ${weekCount} 次，已达到上限`
      };
    }

    return {
      allowed: true,
      message: "本周可打卡"
    };
  }

  if (rule.type === "interval") {
    const latestRecord = getLatestHabitRecord(habit.id);
    if (!latestRecord) {
      return {
        allowed: true,
        message: "首次可打卡"
      };
    }

    const daysPassed = diffDays(latestRecord.time, now);
    if (daysPassed < rule.intervalDays) {
      return {
        allowed: false,
        message: `距离下次打卡还需 ${rule.intervalDays - daysPassed} 天`
      };
    }

    return {
      allowed: true,
      message: "已满足间隔要求"
    };
  }

  return {
    allowed: true,
    message: "可打卡"
  };
}

function renderHabits(data) {
  habitListEl.innerHTML = "";

  if (!Array.isArray(data.habits) || data.habits.length === 0) {
    habitListEl.innerHTML = "<p>暂无习惯</p>";
    return;
  }

  data.habits.forEach((habit) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid #eee";

    const top = document.createElement("div");
    top.style.display = "flex";
    top.style.justifyContent = "space-between";
    top.style.alignItems = "center";
    top.style.gap = "12px";

    const leftWrap = document.createElement("div");
    leftWrap.style.flex = "1";

    const text = document.createElement("div");
    text.className = "item-title";
    text.textContent = `${habit.name}（+${habit.score} 分）`;
    text.style.fontWeight = "bold";

    const subText = document.createElement("div");
    subText.className = "item-subtext";
    subText.textContent = getRuleText(habit);
    subText.style.fontSize = "14px";
    subText.style.color = "#666";
    subText.style.marginTop = "4px";

    leftWrap.appendChild(text);
    leftWrap.appendChild(subText);

    const actionWrap = document.createElement("div");
    actionWrap.className = "item-actions";
    actionWrap.style.display = "flex";
    actionWrap.style.gap = "8px";

    const completeBtn = document.createElement("button");
    completeBtn.dataset.variant = "primary";
    completeBtn.textContent = "完成";
    completeBtn.style.padding = "6px 12px";
    completeBtn.style.border = "none";
    completeBtn.style.borderRadius = "8px";
    completeBtn.style.cursor = "pointer";
    completeBtn.addEventListener("click", async () => {
      await completeHabit(habit);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.dataset.variant = "danger";
    deleteBtn.textContent = "删除";
    deleteBtn.style.padding = "6px 12px";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "8px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", async () => {
      await deleteHabit(habit);
    });

    actionWrap.appendChild(completeBtn);
    actionWrap.appendChild(deleteBtn);

    top.appendChild(leftWrap);
    top.appendChild(actionWrap);
    row.appendChild(top);

    habitListEl.appendChild(row);
  });
}

function renderRewards(data) {
  rewardListEl.innerHTML = "";

  if (!Array.isArray(data.rewards) || data.rewards.length === 0) {
    rewardListEl.innerHTML = "<p>暂无奖励</p>";
    return;
  }

  data.rewards.forEach((reward) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid #eee";
    row.style.gap = "12px";

    const text = document.createElement("span");
    text.className = "item-title";
    text.textContent = `${reward.name}（-${reward.cost} 分）`;
    text.style.flex = "1";

    const actionWrap = document.createElement("div");
    actionWrap.className = "item-actions";
    actionWrap.style.display = "flex";
    actionWrap.style.gap = "8px";

    const exchangeBtn = document.createElement("button");
    exchangeBtn.dataset.variant = "secondary";
    exchangeBtn.textContent = "兑换";
    exchangeBtn.style.padding = "6px 12px";
    exchangeBtn.style.border = "none";
    exchangeBtn.style.borderRadius = "8px";
    exchangeBtn.style.cursor = "pointer";
    exchangeBtn.addEventListener("click", async () => {
      await exchangeReward(reward);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.dataset.variant = "danger";
    deleteBtn.textContent = "删除";
    deleteBtn.style.padding = "6px 12px";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "8px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", async () => {
      await deleteReward(reward);
    });

    actionWrap.appendChild(exchangeBtn);
    actionWrap.appendChild(deleteBtn);

    row.appendChild(text);
    row.appendChild(actionWrap);
    rewardListEl.appendChild(row);
  });
}

function renderRecords(data) {
  recordListEl.innerHTML = "";

  if (!Array.isArray(data.records) || data.records.length === 0) {
    recordListEl.innerHTML = "<p>暂无记录</p>";
    return;
  }

  const recentRecords = data.records.slice(0, 10);

  recentRecords.forEach((record) => {
    const row = document.createElement("div");
    row.className = "item-row"
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = "12px";
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid #eee";

    const leftWrap = document.createElement("div");
    leftWrap.style.flex = "1";
    leftWrap.className = "record-content";

    const title = document.createElement("div");
    title.className = "item-title"
    title.style.fontWeight = "bold";

    if (record.type === "reward") {
      title.textContent = `${record.rewardName} -${record.cost} 分`;
    } else {
      title.textContent = `${record.habitName} +${record.score} 分`;
    }

    const time = document.createElement("div");
    time.className = "item-subtext"
    time.style.fontSize = "14px";
    time.style.color = "#666";
    time.textContent = formatTime(record.time);

    const balance = document.createElement("div");
    balance.className = "item-subtext"
    balance.style.fontSize = "14px";
    balance.style.color = "#666";
    balance.textContent =
      typeof record.balanceAfter === "number"
        ? `当时积分：${record.balanceAfter}`
        : "当时积分：旧记录未保存";

    leftWrap.appendChild(title);
    leftWrap.appendChild(time);
    leftWrap.appendChild(balance);

    const deleteBtn = document.createElement("button");
    deleteBtn.dataset.variant = "danger";
    deleteBtn.textContent = "删除";
    deleteBtn.style.padding = "6px 12px";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "8px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", async () => {
      await deleteRecord(record);
    });

    row.appendChild(leftWrap);
    row.appendChild(deleteBtn);
    recordListEl.appendChild(row);
  });
}

function renderData(data) {
  pointsEl.textContent = data.points ?? 0;
  renderHabits(data);
  renderRewards(data);
  renderRecords(data);
}

function updateHabitRuleUI() {
  const type = habitRuleTypeSelect.value;

  dailyRuleBox.style.display = type === "daily" ? "block" : "none";
  weeklyRuleBox.style.display = type === "weekly" ? "block" : "none";
  intervalRuleBox.style.display = type === "interval" ? "block" : "none";
}

function buildHabitRule() {
  const type = habitRuleTypeSelect.value;

  if (type === "daily") {
    const weekdays = Array.from(weekdayCheckboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => Number(checkbox.value));

    const timesPerDay = Number(dailyTimesInput.value);

    if (weekdays.length === 0) {
      throw new Error("请至少选择一个每日可打卡日期");
    }

    if (!Number.isFinite(timesPerDay) || timesPerDay <= 0) {
      throw new Error("请输入正确的每日打卡次数");
    }

    return {
      type: "daily",
      weekdays,
      timesPerDay
    };
  }

  if (type === "weekly") {
    const timesPerWeek = Number(weeklyTimesInput.value);

    if (!Number.isFinite(timesPerWeek) || timesPerWeek <= 0 || timesPerWeek > 6) {
      throw new Error("每周打卡次数需为 1 到 6");
    }

    return {
      type: "weekly",
      timesPerWeek
    };
  }

  if (type === "interval") {
    const intervalDays = Number(intervalDaysInput.value);

    if (!Number.isFinite(intervalDays) || intervalDays <= 0) {
      throw new Error("请输入正确的间隔天数");
    }

    return {
      type: "interval",
      intervalDays
    };
  }

  throw new Error("未知打卡规则");
}

async function addHabit() {
  try {
    const name = habitNameInput.value.trim();
    const score = Number(habitScoreInput.value);

    if (!name) {
      setStatus("请输入习惯名称", { modal: true, title: "新增习惯", type: "warning" });
      return;
    }

    if (!Number.isFinite(score) || score <= 0) {
      setStatus("请输入大于 0 的积分", { modal: true, title: "新增习惯", type: "warning" });
      return;
    }

    if (!Array.isArray(appData.habits)) {
      appData.habits = [];
    }

    const exists = appData.habits.some(
      (habit) => habit.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      setStatus("这个习惯已经存在", { modal: true, title: "新增习惯", type: "warning" });
      return;
    }

    const rule = buildHabitRule();

    const newHabit = {
      id: createHabitId(name),
      name,
      score,
      rule
    };

    appData.habits.push(newHabit);

    setStatus(`正在添加习惯：${name}`);
    await saveData(appData);
    renderData(appData);

    habitNameInput.value = "";
    habitScoreInput.value = "";
    dailyTimesInput.value = "1";
    weeklyTimesInput.value = "3";
    intervalDaysInput.value = "8";
    setStatus(`已添加习惯：${name}`, { modal: true, title: "新增习惯", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "新增习惯", type: "error" });
  }
}

async function deleteHabit(habit) {
  try {
    const confirmed = window.confirm(`确定删除习惯“${habit.name}”吗？`);
    if (!confirmed) return;

    if (!Array.isArray(appData.habits)) {
      appData.habits = [];
    }

    appData.habits = appData.habits.filter((item) => item.id !== habit.id);

    setStatus(`正在删除习惯：${habit.name}`);
    await saveData(appData);
    renderData(appData);
    setStatus(`已删除习惯：${habit.name}`, { modal: true, title: "删除习惯", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "删除习惯", type: "error" });
  }
}

async function completeHabit(habit) {
  try {
    const checkResult = canCompleteHabit(habit);

    if (!checkResult.allowed) {
      setStatus(`${habit.name}：${checkResult.message}`, { modal: true, title: "打卡提醒", type: "warning" });
      return;
    }

    setStatus(`正在记录：${habit.name}`);

    appData.points = (appData.points ?? 0) + habit.score;

    if (!Array.isArray(appData.records)) {
      appData.records = [];
    }

    appData.records.unshift({
      id: createRecordId(),
      type: "habit",
      habitId: habit.id,
      habitName: habit.name,
      score: habit.score,
      time: new Date().toISOString(),
      balanceAfter: appData.points
    });

    await saveData(appData);
    renderData(appData);
    setStatus(`已完成：${habit.name} +${habit.score} 分`, { modal: true, title: "打卡成功", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "打卡失败", type: "error" });
  }
}

async function addReward() {
  try {
    const name = rewardNameInput.value.trim();
    const cost = Number(rewardCostInput.value);

    if (!name) {
      setStatus("请输入奖励名称", { modal: true, title: "新增奖励", type: "warning" });
      return;
    }

    if (!Number.isFinite(cost) || cost <= 0) {
      setStatus("请输入大于 0 的奖励积分", { modal: true, title: "新增奖励", type: "warning" });
      return;
    }

    if (!Array.isArray(appData.rewards)) {
      appData.rewards = [];
    }

    const exists = appData.rewards.some(
      (reward) => reward.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      setStatus("这个奖励已经存在", { modal: true, title: "新增奖励", type: "warning" });
      return;
    }

    const newReward = {
      id: createRewardId(name),
      name,
      cost
    };

    appData.rewards.push(newReward);

    setStatus(`正在添加奖励：${name}`);
    await saveData(appData);
    renderData(appData);

    rewardNameInput.value = "";
    rewardCostInput.value = "";
    setStatus(`已添加奖励：${name}`, { modal: true, title: "新增奖励", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "新增奖励", type: "error" });
  }
}

async function deleteReward(reward) {
  try {
    const confirmed = window.confirm(`确定删除奖励“${reward.name}”吗？`);
    if (!confirmed) return;

    if (!Array.isArray(appData.rewards)) {
      appData.rewards = [];
    }

    appData.rewards = appData.rewards.filter((item) => item.id !== reward.id);

    setStatus(`正在删除奖励：${reward.name}`);
    await saveData(appData);
    renderData(appData);
    setStatus(`已删除奖励：${reward.name}`, { modal: true, title: "删除奖励", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "删除奖励", type: "error" });
  }
}

async function exchangeReward(reward) {
  try {
    if ((appData.points ?? 0) < reward.cost) {
      setStatus(`积分不足，无法兑换：${reward.name}`, { modal: true, title: "兑换失败", type: "warning" });
      return;
    }

    appData.points = (appData.points ?? 0) - reward.cost;

    if (!Array.isArray(appData.records)) {
      appData.records = [];
    }

    appData.records.unshift({
      id: createRecordId(),
      type: "reward",
      rewardId: reward.id,
      rewardName: reward.name,
      cost: reward.cost,
      time: new Date().toISOString(),
      balanceAfter: appData.points
    });

    setStatus(`正在兑换：${reward.name}`);
    await saveData(appData);
    renderData(appData);
    setStatus(`已兑换：${reward.name} -${reward.cost} 分`, { modal: true, title: "兑换成功", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "兑换失败", type: "error" });
  }
}

async function deleteRecord(record) {
  try {
    const confirmed = window.confirm("确定删除这条记录吗？删除后积分会回归。");
    if (!confirmed) return;

    if (!Array.isArray(appData.records)) {
      appData.records = [];
    }

    if (record.type === "habit") {
      appData.points = Math.max(0, (appData.points ?? 0) - (record.score ?? 0));
    } else if (record.type === "reward") {
      appData.points = (appData.points ?? 0) + (record.cost ?? 0);
    }

    appData.records = appData.records.filter((item) => item.id !== record.id);

    setStatus("正在删除记录...");
    await saveData(appData);
    renderData(appData);
    setStatus("记录已删除，积分已回归", { modal: true, title: "删除记录", type: "success" });
  } catch (error) {
    console.error(error);
    setStatus(error.message, { modal: true, title: "删除记录",type: "error" });
  }
}

async function init() {
  try {
    setStatus("正在读取云端数据...");
    appData = await fetchData();

    if (!Array.isArray(appData.habits)) {
      appData.habits = [];
    }

    if (!Array.isArray(appData.rewards)) {
      appData.rewards = [];
    }

    if (!Array.isArray(appData.records)) {
      appData.records = [];
    }

    renderData(appData);
    updateHabitRuleUI();
    setStatus("读取成功");
  } catch (error) {
    console.error(error);
    setStatus(`读取失败：${error.message}`, { modal: true, title: "初始化失败", type: "error" });
    pointsEl.textContent = "--";
  }
}

addHabitBtn.addEventListener("click", async () => {
  await addHabit();
});

habitNameInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    await addHabit();
  }
});

habitScoreInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    await addHabit();
  }
});

habitRuleTypeSelect.addEventListener("change", updateHabitRuleUI);

addRewardBtn.addEventListener("click", async () => {
  await addReward();
});

rewardNameInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    await addReward();
  }
});

rewardCostInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    await addReward();
  }
});

init();