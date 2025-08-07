// Game Variables
let balance = parseInt(localStorage.getItem('frost_balance'));
if (isNaN(balance)) {
  balance = 100000;
  alert("🎉 Selamat datang! Kamu mendapatkan saldo awal IDR 100,000");
}
let rewardBank = 0;
let gameActive = false;
let bombIndexes = [], revealedIndexes = [], multiplier = 1, currentBet = 0;
let rewardStartTime = Date.now();

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
const usedCodes = JSON.parse(localStorage.getItem('used_redeem_codes') || []);

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
  return parseInt(sanitizeInput(betAmountInput.value)) || 0;
}

function updateBalanceUI() {
  balanceEl.textContent = formatNumber(balance);
  localStorage.setItem('frost_balance', balance);
}

function updateMultiplierUI() {
  multiplierEl.textContent = `x${multiplier.toFixed(2)}`;
}

function updateRewardBankUI() {
  rewardBankEl.textContent = formatNumber(rewardBank);
  menuRewardBankEl.textContent = formatNumber(rewardBank);
}

function resetGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const div = document.createElement('div');
        div.className = 'cell show-multiplier'; // Langsung tambahkan show-multiplier
        
        const multiplierEl = document.createElement('div');
        multiplierEl.className = 'cell-multiplier';
        multiplierEl.textContent = 'x1.00';
        div.appendChild(multiplierEl);
        
        div.addEventListener('click', () => revealCell(i, div));
        gridEl.appendChild(div);
    }
}

// Game Functions
function startGame() {
  if (gameActive) return;
  const bet = parseBet();
  const mineCount = parseInt(document.getElementById('mineCount').value);
  
  if (bet <= 0) {
    showPopup('insufficientPopup');
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
  
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.add('show-multiplier');
    const multEl = cell.querySelector('.cell-multiplier');
    if (multEl) multEl.textContent = `x${multiplier.toFixed(2)}`;
  });
}

function generateBombs(count) {
  const arr = [];
  while (arr.length < count) {
    const rand = Math.floor(Math.random() * 25);
    if (!arr.includes(rand)) arr.push(rand);
  }
  return arr;
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
    
    // Show bomb explosion
    document.getElementById('lostAmount').textContent = formatNumber(currentBet);
    showPopup('bombPopup');
    
    // Reveal all bombs
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
    multiplier += 0.25;
    updateMultiplierUI();
    cashoutBtn.style.display = 'block';
    
    // Update multiplier display
    const cells = document.querySelectorAll('.cell:not(.revealed)');
    cells.forEach(cell => {
      const multEl = cell.querySelector('.cell-multiplier');
      if (multEl) multEl.textContent = `x${multiplier.toFixed(2)}`;
    });
  }
  cellEl.appendChild(content);
}

function cashOut() {
  if (!gameActive || revealedIndexes.length === 0) return;
  const winAmount = Math.floor(currentBet * multiplier);
  balance += winAmount;
  updateBalanceUI();
  gameActive = false;
  cashoutBtn.style.display = 'none';
  betButton.disabled = false;
  
  document.getElementById('cashoutMultBox').textContent = `x${multiplier.toFixed(2)}`;
  document.getElementById('cashoutAmountBox').textContent = `IDR ${formatNumber(winAmount)}`;
  const box = document.getElementById('cashoutBox');
  box.style.display = 'block';
  setTimeout(() => box.style.display = 'none', 3000);
  
  saveGameHistory({
    result: "💎 Menang",
    bet: currentBet,
    bombs: bombIndexes.length,
    desc: `x${multiplier.toFixed(2)} | Menang IDR ${formatNumber(winAmount)}`,
    time: new Date().toLocaleString()
  });
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

function getBaseMultiplier(bombs) {
  const table = { 
    1: 1.5, 2: 1.4, 3: 1.3, 4: 1.25, 5: 1.2, 
    6: 1.15, 7: 1.1, 8: 1.05, 9: 1.03, 10: 1.01 
  };
  return table[bombs] || 1;
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
}

function showReward() {
  if (rewardBank > 0) {
    balance += rewardBank;
    alert(`🎁 Kamu mengklaim reward IDR ${formatNumber(rewardBank)}`);
    rewardBank = 0;
    rewardStartTime = Date.now();
    updateRewardBankUI();
    updateBalanceUI();
  } else {
    alert("⏳ Belum ada reward yang bisa diklaim.");
  }
}

function saveGameHistory(entry) {
  let history = JSON.parse(localStorage.getItem('frost_game_history')) || [];
  history.unshift(entry);
  if (history.length > 50) history = history.slice(0, 50);
  localStorage.setItem('frost_game_history', JSON.stringify(history));
}

function showGameHistory() {
  const history = JSON.parse(localStorage.getItem('frost_game_history')) || [];
  if (history.length === 0) return alert("Belum ada riwayat permainan.");
  
  let text = "📜 History Permainan:\n\n";
  history.forEach((h, i) => {
    text += `${i + 1}. ${h.result} – Taruhan: IDR ${formatNumber(h.bet)} | Bom: ${h.bombs} | ${h.desc} | ${h.time}\n`;
  });
  
  alert(text);
}

function showRedeem() {
  const code = prompt("🎟️ Masukkan kode redeem:");
  if (!code) return;
  
  const input = code.trim().toLowerCase();
  const validCodes = ["frostsaldo", "frost100k", "frostgg", "frostps"];
  
  if (!validCodes.includes(input)) return alert("❌ Kode tidak valid.");
  if (usedCodes.includes(input)) return alert("⚠️ Kode ini sudah pernah digunakan.");
  
  const reward = Math.floor(Math.random() * (250000 - 1000 + 1)) + 1000;
  balance += reward;
  usedCodes.push(input);
  localStorage.setItem('used_redeem_codes', JSON.stringify(usedCodes));
  updateBalanceUI();
  
  alert(`🎉 Selamat! Kamu mendapatkan IDR ${formatNumber(reward)} dari kode redeem.`);
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

function showWithdraw() {
  const username = prompt("👤 Masukkan username kamu:");
  if (!username || username.trim() === "") {
    alert("❌ Username harus diisi.");
    return;
  }

  const world = prompt("🌍 Masukkan nama world kamu:");
  if (!world || world.trim() === "") {
    alert("❌ World name harus diisi.");
    return;
  }

  const amountStr = prompt(`🏦 Halo ${username.trim()}, masukkan jumlah withdraw:`);
  if (!amountStr) return;

  const amount = parseInt(sanitizeInput(amountStr));
  if (isNaN(amount) || amount <= 0) return alert("❌ Jumlah tidak valid.");
  if (amount > balance) return alert("⚠️ Saldo tidak cukup.");

  balance -= amount;
  updateBalanceUI();
  
  document.getElementById('withdrawAmount').textContent = `IDR ${formatNumber(amount)}`;
  showPopup('withdrawPopup');
  
  sendWithdrawToWebhook(username.trim(), world.trim(), amount);
}

function claimDailyReward() {
  const now = Date.now();
  const lastClaim = parseInt(localStorage.getItem('daily_reward_last') || 0);
  const diff = now - lastClaim;
  
  if (diff < 24 * 60 * 60 * 1000) {
    const remaining = 24 * 60 * 60 * 1000 - diff;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return alert(`⏳ Kamu sudah klaim hari ini!\nCoba lagi dalam ${hours} jam ${minutes} menit.`);
  }
  
  const reward = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
  balance += reward;
  updateBalanceUI();
  localStorage.setItem('daily_reward_last', now.toString());
  
  alert(`🎉 Selamat! Kamu mendapatkan IDR ${formatNumber(reward)} dari Daily Reward.`);
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
// Tambahkan di bagian paling bawah script.js
document.addEventListener('DOMContentLoaded', function() {
    updateBalanceUI();
    updateMultiplierUI();
    updateRewardBankUI();
    resetGrid();
    
    // Inisialisasi tambahan
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.add('show-multiplier');
        const multEl = cell.querySelector('.cell-multiplier');
        if (multEl) multEl.textContent = 'x1.00';
    });
});

// Initial UI Update
updateBalanceUI();
updateMultiplierUI();
updateRewardBankUI();
resetGrid();
