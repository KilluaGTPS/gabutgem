// Game Variables
let balance = parseInt(localStorage.getItem('frost_balance')) || 100000;
let rewardBank = parseInt(localStorage.getItem('frost_reward_bank')) || 0;
let gameActive = false;
let bombIndexes = [], revealedIndexes = [], multiplier = 1, currentBet = 0;
let rewardStartTime = parseInt(localStorage.getItem('reward_start_time')) || Date.now();
const usedCodes = JSON.parse(localStorage.getItem('used_redeem_codes') || "[]");
let redeemCodes = JSON.parse(localStorage.getItem('active_redeem_codes') || "[]");
let isAdmin = localStorage.getItem('frost_admin') === 'true';

// Multiplier Configuration
const multiplierSettings = {
  baseMultipliers: {
    1: 1.1,
    2: 1.1,
    3: 1.2,
    4: 1.3,
    5: 1.4,
    6: 1.5,
    7: 1.7,
    8: 2.0,
    9: 2.5,
    10: 3.0
  },
  incrementMultipliers: {
    1: 0.1,
    2: 0.15,
    3: 0.2,
    4: 0.25,
    5: 0.3,
    6: 0.4,
    7: 0.5,
    8: 0.7,
    9: 0.9,
    10: 1.2
  }
};

// DOM Elements
const balanceEl = document.getElementById('balance');
const multiplierEl = document.getElementById('multiplier-info');
const cashoutBtn = document.getElementById('cashoutButton');
const betAmountInput = document.getElementById('betAmount');
const betButton = document.getElementById('betButton');
const gridEl = document.getElementById('mineGrid');
const rewardBankEl = document.getElementById('rewardBank');
const menuRewardBankEl = document.getElementById('menuRewardBank');
const rewardProgressBar = document.getElementById('rewardProgressBar');
const historyListEl = document.getElementById('historyList');
const activeCodesListEl = document.getElementById('activeCodesList');
const adminTabBtn = document.getElementById('adminTabBtn');
const notificationContainer = document.getElementById('notificationContainer');
const inputSection = document.querySelector('.input-section');
const bombSelector = document.querySelector('.bomb-selector');
const quickBetButtons = document.querySelector('.quick-bet-buttons');
const betMultButtons = document.querySelector('.bet-mult-buttons');

// Webhook URL
const WEBHOOK_URL = "https://discord.com/api/webhooks/1388579228953346068/w6kccMK_aqpGxLKjqt7xgHJj6dApStuavmOgE5ExM-GXJKkLt2bvPWkvveeyJC1YtlMM";

// Helper Functions
function formatNumber(val) {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function sanitizeInput(val) {
  return val.toString().replace(/[^0-9]/g, '');
}

function parseBet() {
  const rawValue = parseInt(sanitizeInput(betAmountInput.value)) || 0;
  return Math.max(0, rawValue);
}

function updateBalanceUI() {
  balanceEl.textContent = formatNumber(balance);
  localStorage.setItem('frost_balance', balance);
}

function updateMultiplierUI() {
  const bombCount = bombIndexes.length;
  const increment = multiplierSettings.incrementMultipliers[bombCount] || 0.25;
  multiplierEl.innerHTML = `x${multiplier.toFixed(2)}<br><small>+${increment.toFixed(2)} per gem</small>`;
}

function updateRewardBankUI() {
  const formatted = formatNumber(rewardBank);
  rewardBankEl.textContent = formatted;
  menuRewardBankEl.textContent = formatted;
  localStorage.setItem('frost_reward_bank', rewardBank);
}

function resetGrid() {
  gridEl.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const div = document.createElement('div');
    div.className = 'cell show-multiplier';
    
    const multiplierEl = document.createElement('div');
    multiplierEl.className = 'cell-multiplier';
    multiplierEl.textContent = 'x1.00';
    div.appendChild(multiplierEl);
    
    div.addEventListener('click', () => revealCell(i, div));
    gridEl.appendChild(div);
  }
}

function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i> ${message}`;
  
  notificationContainer.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, duration);
}

// Game Functions
function startGame() {
  if (gameActive) return;
  const bet = parseBet();
  const mineCount = parseInt(document.getElementById('mineCount').value);
  
  if (bet <= 0) {
    showNotification("❌ Masukkan jumlah taruhan yang valid", "error");
    return;
  }
  
  if (bet > balance) {
    showPopup('insufficientPopup');
    return;
  }
  
  currentBet = bet;
  balance -= bet;
  updateBalanceUI(); 
  resetGrid(); 
  revealedIndexes = [];
  multiplier = getBaseMultiplier(mineCount);
  updateMultiplierUI();
  bombIndexes = generateBombs(mineCount);
  gameActive = true; 
  cashoutBtn.style.display = 'none';
  betButton.disabled = true;
  
  inputSection.style.opacity = '0';
  inputSection.style.height = '0';
  inputSection.style.pointerEvents = 'none';
  inputSection.style.margin = '0';
  inputSection.style.padding = '0';
  inputSection.style.overflow = 'hidden';
  inputSection.style.transition = 'all 0.3s ease';
  
  document.querySelectorAll('.bomb-btn').forEach(btn => {
    btn.disabled = true;
  });
  
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.add('show-multiplier');
    const multEl = cell.querySelector('.cell-multiplier');
    if (multEl) multEl.textContent = `x${multiplier.toFixed(2)}`;
  });
}

function generateBombs(count) {
  const arr = [];
  const allPositions = Array.from({length: 25}, (_, i) => i);
  
  for (let i = allPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
  }
  
  return allPositions.slice(0, count);
}

function revealCell(index, cellEl) {
  if (!gameActive || revealedIndexes.includes(index)) return;
  
  const content = document.createElement('div');
  content.className = 'cell-content';
  
  if (bombIndexes.includes(index)) {
    cellEl.classList.add('revealed', 'bomb');
    content.textContent = '💣';
    gameActive = false;
    cashoutBtn.style.display = 'none';
    betButton.disabled = false;
    
    showInputSection();
    
    document.getElementById('lostAmount').textContent = formatNumber(currentBet);
    showPopup('bombPopup');
    
    bombIndexes.forEach(i => {
      const c = gridEl.children[i];
      if (!c.classList.contains('revealed')) {
        c.classList.add('revealed', 'bomb');
        const e = document.createElement('div');
        e.className = 'cell-content';
        e.textContent = '💣';
        c.appendChild(e);
      }
    });
    
    saveGameHistory({
      result: "💥 Kalah",
      bet: currentBet,
      bombs: bombIndexes.length,
      desc: `Klik ke-${revealedIndexes.length + 1}`,
      time: new Date().toLocaleString()
    });
  } else {
    cellEl.classList.add('revealed', 'safe');
    content.textContent = '💎';
    revealedIndexes.push(index);
    
    const bombCount = bombIndexes.length;
    const increment = multiplierSettings.incrementMultipliers[bombCount] || 0.25;
    multiplier += increment;
    
    updateMultiplierUI();
    cashoutBtn.style.display = 'block';
    
    const cells = document.querySelectorAll('.cell:not(.revealed)');
    cells.forEach(cell => {
      const multEl = cell.querySelector('.cell-multiplier');
      if (multEl) multEl.textContent = `x${multiplier.toFixed(2)}`;
    });
  }
  cellEl.appendChild(content);
}

function showInputSection() {
  inputSection.style.opacity = '1';
  inputSection.style.height = '';
  inputSection.style.pointerEvents = 'auto';
  inputSection.style.margin = '';
  inputSection.style.padding = '';
  
  document.querySelectorAll('.bomb-btn').forEach(btn => {
    btn.disabled = false;
  });
}

function cashOut() {
  if (!gameActive || revealedIndexes.length === 0) return;
  const winAmount = Math.floor(currentBet * multiplier);
  balance += winAmount;
  updateBalanceUI();
  gameActive = false;
  cashoutBtn.style.display = 'none';
  betButton.disabled = false;
  
  showInputSection();
  
  const cashoutBox = document.getElementById('cashoutBox');
  cashoutBox.innerHTML = `
    <div class="cashout-header">
      <i class="fas fa-trophy"></i>
      <h2>WINNER!</h2>
      <i class="fas fa-trophy"></i>
    </div>
    <div class="cashout-multiplier">x${multiplier.toFixed(2)}</div>
    <div class="cashout-amount">IDR ${formatNumber(winAmount)}</div>
    <div class="cashout-details">
      <div>Bet: IDR ${formatNumber(currentBet)}</div>
      <div>Bombs: ${bombIndexes.length}</div>
      <div>Clicks: ${revealedIndexes.length}</div>
    </div>
  `;
  
  cashoutBox.style.display = 'block';
  cashoutBox.style.animation = 'cashoutAnimation 1.5s ease-out';
  setTimeout(() => {
    cashoutBox.style.animation = '';
    setTimeout(() => {
      cashoutBox.style.display = 'none';
    }, 2000);
  }, 3000);
  
  createConfetti();
  
  saveGameHistory({
    result: "💎 Menang",
    bet: currentBet,
    bombs: bombIndexes.length,
    desc: `x${multiplier.toFixed(2)} | Menang IDR ${formatNumber(winAmount)}`,
    time: new Date().toLocaleString()
  });
}

function createConfetti() {
  const confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti-container';
  document.body.appendChild(confettiContainer);
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confettiContainer.appendChild(confetti);
  }
  
  setTimeout(() => {
    confettiContainer.remove();
  }, 3000);
}

// Bet Adjustment Functions
function adjustBet(amount) {
  if (gameActive) return;
  let bet = parseBet();
  bet += amount;
  if (bet > balance) bet = balance;
  betAmountInput.value = formatNumber(bet);
}

function halveBet() {
  if (gameActive) return;
  let bet = parseBet(); 
  bet = Math.floor(bet / 2);
  betAmountInput.value = formatNumber(bet);
}

function doubleBet() {
  if (gameActive) return;
  let bet = parseBet(); 
  bet = Math.floor(bet * 2);
  if (bet > balance) bet = balance;
  betAmountInput.value = formatNumber(bet);
}

function setBombCount(count) {
  const currentBet = parseBet();
  if (currentBet > balance) {
    showNotification("⚠️ Kurangi taruhan atau tambah saldo untuk bom sebanyak ini", "error");
    return;
  }
  document.getElementById('mineCount').value = count;
  document.querySelectorAll('.bomb-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.bomb-btn:nth-child(${count})`).classList.add('active');
}

function getBaseMultiplier(bombs) {
  return multiplierSettings.baseMultipliers[bombs] || 1.0;
}

// Menu Functions
function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  menu.classList.toggle('active');
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
  
  if (tabId === 'historyTab') {
    loadGameHistory();
  } else if (tabId === 'redeemTab') {
    updateActiveCodesList();
  }
}

function showReward() {
  if (rewardBank > 0) {
    balance += rewardBank;
    showNotification(`🎁 Kamu mengklaim reward IDR ${formatNumber(rewardBank)}`, "success");
    rewardBank = 0;
    rewardStartTime = Date.now();
    localStorage.setItem('reward_start_time', rewardStartTime.toString());
    updateRewardBankUI();
    updateBalanceUI();
  } else {
    showNotification("⏳ Belum ada reward yang bisa diklaim", "info");
  }
}

function saveGameHistory(entry) {
  let history = JSON.parse(localStorage.getItem('frost_game_history')) || [];
  history.unshift(entry);
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem('frost_game_history', JSON.stringify(history));
}

function loadGameHistory() {
  const history = JSON.parse(localStorage.getItem('frost_game_history')) || [];
  historyListEl.innerHTML = '';
  
  if (history.length === 0) {
    historyListEl.innerHTML = '<p class="empty-history">Belum ada riwayat permainan.</p>';
    return;
  }
  
  history.forEach((h, i) => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const resultClass = h.result.includes("Menang") ? 'win' : 'lose';
    
    historyItem.innerHTML = `
      <div class="history-header ${resultClass}">
        <span>${h.result}</span>
        <span>${h.time}</span>
      </div>
      <div class="history-details">
        <div><span>Taruhan:</span> IDR ${formatNumber(h.bet)}</div>
        <div><span>Bom:</span> ${h.bombs}</div>
        <div><span>Detail:</span> ${h.desc}</div>
      </div>
    `;
    
    historyListEl.appendChild(historyItem);
  });
}

function updateActiveCodesList() {
  activeCodesListEl.innerHTML = '';
  
  if (redeemCodes.length === 0) {
    activeCodesListEl.innerHTML = '<p>Tidak ada kode aktif saat ini.</p>';
    return;
  }
  
  const ul = document.createElement('ul');
  redeemCodes.forEach(code => {
    const li = document.createElement('li');
    const expiresIn = Math.max(0, Math.floor((code.expiresAt - Date.now()) / 60000));
    li.innerHTML = `<strong>${code.code}</strong> - IDR ${formatNumber(code.amount)} (Kadaluarsa dalam ${expiresIn} menit)`;
    ul.appendChild(li);
  });
  activeCodesListEl.appendChild(ul);
}

function processRedeem() {
  const codeInput = document.getElementById('redeemCodeInput');
  if (!codeInput) return;
  
  const code = codeInput.value.trim().toLowerCase();
  
  if (!code) {
    showNotification("❌ Harap masukkan kode redeem", "error");
    return;
  }
  
  const activeCode = redeemCodes.find(c => c.code.toLowerCase() === code.toLowerCase());
  if (activeCode) {
    balance += activeCode.amount;
    updateBalanceUI();
    showNotification(`🎉 Selamat! Kamu mendapatkan IDR ${formatNumber(activeCode.amount)} dari kode redeem`, "success");
    codeInput.value = '';
    showTab('mainMenu');
    return;
  }
  
  const validCodes = ["frostsaldo", "frost100k", "frostgg", "frostps"];
  if (!validCodes.includes(code)) {
    showNotification("❌ Kode tidak valid", "error");
    return;
  }
  
  if (usedCodes.includes(code)) {
    showNotification("⚠️ Kode ini sudah pernah digunakan", "error");
    return;
  }
  
  const reward = Math.floor(Math.random() * (250000 - 1000 + 1)) + 1000;
  balance += reward;
  usedCodes.push(code);
  localStorage.setItem('used_redeem_codes', JSON.stringify(usedCodes));
  updateBalanceUI();
  
  showNotification(`🎉 Selamat! Kamu mendapatkan IDR ${formatNumber(reward)} dari kode redeem`, "success");
  codeInput.value = '';
  showTab('mainMenu');
}

function processWithdraw() {
  const username = document.getElementById('withdrawUsername').value.trim();
  const world = document.getElementById('withdrawWorld').value.trim();
  const amountStr = document.getElementById('withdrawAmountInput').value;
  
  if (!username) {
    showNotification("❌ Username harus diisi", "error");
    return;
  }
  
  if (!world) {
    showNotification("❌ World name harus diisi", "error");
    return;
  }
  
  const amount = parseInt(sanitizeInput(amountStr));
  if (isNaN(amount) || amount <= 0) {
    showNotification("❌ Jumlah tidak valid", "error");
    return;
  }
  
  if (amount > balance) {
    showNotification("⚠️ Saldo tidak cukup", "error");
    return;
  }

  balance -= amount;
  updateBalanceUI();
  
  document.getElementById('withdrawAmount').textContent = `IDR ${formatNumber(amount)}`;
  showPopup('withdrawPopup');
  
  sendWithdrawToWebhook(username, world, amount);
  
  document.getElementById('withdrawUsername').value = '';
  document.getElementById('withdrawWorld').value = '';
  document.getElementById('withdrawAmountInput').value = '';
}

function sendWithdrawToWebhook(username, world, amount) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("123456789012345678")) {
    console.warn("⚠️ Webhook belum diatur dengan benar!");
    return;
  }

  const payload = {
    embeds: [
      {
        title: "💸 Permintaan Withdraw",
        color: 0x00ff00,
        fields: [
          { name: "👤 Username", value: username, inline: true },
          { name: "🌍 World", value: world, inline: true },
          { name: "💰 Jumlah", value: `IDR ${formatNumber(amount)}`, inline: false }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      console.error("❌ Gagal mengirim webhook:", response.statusText);
    }
  })
  .catch(error => {
    console.error("❌ Terjadi kesalahan saat mengirim webhook:", error);
  });
}

function claimDailyReward() {
  const now = Date.now();
  const lastClaim = parseInt(localStorage.getItem('daily_reward_last')) || 0;
  const diff = now - lastClaim;
  
  if (diff < 24 * 60 * 60 * 1000) {
    const remaining = 24 * 60 * 60 * 1000 - diff;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    showNotification(`⏳ Kamu sudah klaim hari ini! Coba lagi dalam ${hours} jam ${minutes} menit`, "info");
    return;
  }
  
  const reward = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
  balance += reward;
  updateBalanceUI();
  localStorage.setItem('daily_reward_last', now.toString());
  
  document.getElementById('dailyRewardAmount').textContent = formatNumber(reward);
  showPopup('dailyRewardPopup');
}

// Admin Functions
function processAdminCommand() {
  const commandInput = document.getElementById('adminCommand');
  const command = commandInput.value.trim();
  
  if (!command.startsWith('/')) {
    showNotification("❌ Command harus dimulai dengan /", "error");
    return;
  }
  
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  
  if (cmd === '/addredeem') {
    if (parts.length < 4) {
      showNotification("❌ Format: /addredeem CODE AMOUNT MINUTES", "error");
      return;
    }
    
    const code = parts[1];
    const amount = parseInt(parts[2]);
    const minutes = parseInt(parts[3]);
    
    if (isNaN(amount) || amount <= 0) {
      showNotification("❌ Jumlah harus angka positif", "error");
      return;
    }
    
    if (isNaN(minutes) || minutes <= 0) {
      showNotification("❌ Menit harus angka positif", "error");
      return;
    }
    
    const expiresAt = Date.now() + minutes * 60000;
    const newCode = { code, amount, expiresAt };
    
    redeemCodes.push(newCode);
    localStorage.setItem('active_redeem_codes', JSON.stringify(redeemCodes));
    
    sendRedeemCodeToWebhook(code, amount, minutes);
    
    showNotification(`✅ Kode redeem "${code}" untuk IDR ${formatNumber(amount)} selama ${minutes} menit berhasil dibuat`, "success");
    commandInput.value = '';
    updateActiveCodesList();
  } else {
    showNotification("❌ Command tidak dikenali", "error");
  }
}

function sendRedeemCodeToWebhook(code, amount, minutes) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("123456789012345678")) {
    console.warn("⚠️ Webhook belum diatur dengan benar!");
    return;
  }

  const payload = {
    embeds: [
      {
        title: "🎟️ Redeem Code Baru",
        color: 0xffaa00,
        fields: [
          { name: "🆔 Kode", value: code, inline: true },
          { name: "💰 Jumlah", value: `IDR ${formatNumber(amount)}`, inline: true },
          { name: "⏳ Berlaku", value: `${minutes} menit`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      console.error("❌ Gagal mengirim webhook:", response.statusText);
    }
  })
  .catch(error => {
    console.error("❌ Terjadi kesalahan saat mengirim webhook:", error);
  });
}

function checkExpiredCodes() {
  const now = Date.now();
  const activeCodes = redeemCodes.filter(code => code.expiresAt > now);
  
  if (activeCodes.length !== redeemCodes.length) {
    redeemCodes = activeCodes;
    localStorage.setItem('active_redeem_codes', JSON.stringify(redeemCodes));
    updateActiveCodesList();
  }
}

// Popup Functions
function showPopup(id) {
  const popup = document.getElementById(id);
  popup.classList.add('active');
}

function closePopup(id) {
  const popup = document.getElementById(id);
  popup.classList.remove('active');
}

// Initialize Game
function initGame() {
  updateBalanceUI();
  updateMultiplierUI();
  updateRewardBankUI();
  resetGrid();
  
  betAmountInput.value = formatNumber(1000);
  setBombCount(1);
  
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.add('show-multiplier');
    const multEl = cell.querySelector('.cell-multiplier');
    if (multEl) multEl.textContent = 'x1.00';
  });
  
  if (isAdmin) {
    adminTabBtn.style.display = 'block';
  }
  
  checkExpiredCodes();
}

// Reward Bank System
setInterval(() => {
  const now = Date.now();
  const elapsed = now - rewardStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const percentage = Math.min((seconds / 60) * 100, 100);
  rewardProgressBar.style.width = percentage + "%";
  
  if (seconds >= 60) {
    const extra30s = Math.floor((seconds - 60) / 30);
    let reward = 25 * (1 + 0.5 * extra30s);
    rewardBank = Math.floor(reward);
    updateRewardBankUI();
    localStorage.setItem('frost_reward_bank', rewardBank.toString());
  }
  
  if (seconds % 60 === 0) {
    checkExpiredCodes();
  }
}, 1000);

// Event Listeners
betAmountInput.addEventListener('input', function() {
  const cursorPos = this.selectionStart;
  const sanitized = sanitizeInput(this.value);
  const formatted = formatNumber(parseInt(sanitized) || 0);
  
  this.value = formatted;
  this.setSelectionRange(cursorPos, cursorPos);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initGame);
