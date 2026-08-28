const SUPABASE_URL = 'https://ikgaljvpwuzirvaoesjb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4TutW03B8hhWjB6GCCsKVQ_P9riIjx-';
const labels = { rock: '✊ 바위', paper: '✋ 보', scissors: '✌️ 가위' };
const resultLabels = { win: '승리', draw: '무승부', loss: '패배' };
const playerId = getPlayerId();
let busy = false;

function getPlayerId() {
  let id = localStorage.getItem('rps-player-id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('rps-player-id', id); }
  return id;
}

function outcome(player, computer) {
  if (player === computer) return 'draw';
  return (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper') ? 'win' : 'loss';
}

async function api(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...options.headers }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
}

async function play(playerChoice) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('.choice').forEach(b => b.disabled = true);
  const choices = ['rock', 'paper', 'scissors'];
  const computerChoice = choices[Math.floor(Math.random() * choices.length)];
  const result = outcome(playerChoice, computerChoice);
  showResult(result, playerChoice, computerChoice);
  try {
    await api('rps_games', { method: 'POST', body: JSON.stringify({ player_id: playerId, player_choice: playerChoice, computer_choice: computerChoice, result }) });
    await loadHistory();
  } catch (error) {
    document.querySelector('#result p').textContent = '결과는 나왔지만 저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
    console.error(error);
  } finally {
    busy = false;
    document.querySelectorAll('.choice').forEach(b => b.disabled = false);
  }
}

function showResult(result, player, computer) {
  const box = document.querySelector('#result');
  const copy = result === 'win' ? ['YOU WIN', '이겼다! 완벽한 한 수였어요.'] : result === 'loss' ? ['YOU LOSE', '아쉽다! 다음 판엔 뒤집어봐요.'] : ['DRAW', '통했네! 같은 생각을 했어요.'];
  box.className = `result ${result === 'win' ? 'won' : result === 'loss' ? 'lost' : 'drew'}`;
  box.innerHTML = `<span class="result-label">${copy[0]}</span><strong>${copy[1]}</strong><p>나 ${labels[player]} · 컴퓨터 ${labels[computer]}</p>`;
}

async function loadHistory() {
  try {
    const games = await api(`rps_games?player_id=eq.${playerId}&select=*&order=created_at.desc&limit=500`);
    const total = games.length, wins = games.filter(g => g.result === 'win').length, draws = games.filter(g => g.result === 'draw').length, losses = total - wins - draws;
    const rate = total ? Math.round((wins / total) * 100) : 0;
    document.querySelector('#total').textContent = total;
    document.querySelector('#wins').textContent = wins;
    document.querySelector('#draws').textContent = draws;
    document.querySelector('#losses').textContent = losses;
    document.querySelector('#winRate').innerHTML = `${rate}<small>%</small>`;
    document.querySelector('#winBar').style.width = `${rate}%`;
    document.querySelector('#history').innerHTML = games.length ? games.slice(0,10).map(g => `<div class="history-row"><span class="time">${new Date(g.created_at).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}</span><span class="match">${labels[g.player_choice]}<span class="vs">VS</span>${labels[g.computer_choice]}</span><span class="badge ${g.result}">${resultLabels[g.result]}</span></div>`).join('') : '<div class="empty">아직 기록이 없어요. 첫 승부를 시작해 보세요!</div>';
  } catch (error) {
    document.querySelector('#history').innerHTML = '<div class="empty">전적을 불러오지 못했어요. 새로고침해 주세요.</div>';
    console.error(error);
  }
}

document.querySelectorAll('.choice').forEach(button => button.addEventListener('click', () => play(button.dataset.choice)));
document.querySelector('#refresh').addEventListener('click', loadHistory);
loadHistory();
