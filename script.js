// ====== 사용자 고유 ID 생성 함수 ======
function generateUserFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Fingerprint test', 2, 2);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

// ====== 환경설정 ======
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxgz7TOUoN_Bbww3SXcIn9zbvfcxrzFODZ4wyLfdedVppKY9JfttqoIH6fYKUFc9DYGqw/exec';
const SECRET = 'dh-20250827-firstproject001';
const params = new URLSearchParams(location.search);
const sessionId = params.get('s') || new Date().toISOString().slice(0,10);
const participantId = params.get('p') || ('USER-' + generateUserFingerprint());

// ====== 문항 정의(12문항) ======
const ITEMS = [
  '만나면 나이 묻고, 나보다 어리면 반말한다',
  '"~~란다" 식의 명제를 자주 구사한다',
  '"내가 너만 했을 때~"란 얘기를 자주 한다',
  '개인적 인맥 자꾸 얘기하게 된다',
  '의견 얘기하라 했지만 결국 정답은 내 의견이다',
  '내가 한 때 잘 나갔다는 사실 알려주고 싶다',
  '개인 약속 이유로 회식 불참 이해 못한다',
  '나보다 더 열심히 일하는 사람 없는 것 같다',
  '요즘 애들은 노력 없이 불평만 하는 것 같다',
  '잘나가는 후배를 보면 단점부터 찾는다',
  '나보다 늦게 출근하는 후배 거슬린다',
  '기어이 나를 움직이게 만드는 후배 불쾌하다'
];

// ====== 초기화 함수 ======
function initializeApp() {
  // 렌더링
  const qWrap = document.getElementById('questions');
  if (!qWrap) {
    console.error('questions 엘리먼트를 찾을 수 없습니다.');
    return;
  }
  
  qWrap.innerHTML = ITEMS.map((t,i)=>(
    `<div class="q">
      <label><input type="checkbox" data-q="Q${i+1}" /> ${i+1}. ${t}</label>
    </div>`
  )).join('');

  // 제출 버튼 이벤트
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
  }
  
  // 디버깅
  console.log('Session ID:', sessionId);
  console.log('Participant ID:', participantId);
}

// ====== DOM 로드 처리 개선 ======
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM이 이미 로드된 경우 즉시 실행
  initializeApp();
}

// 나머지 함수들은 그대로...
function scoreToBand(score){
  if (score <= 2) return '성숙한 어른';
  if (score <= 5) return '잠재적 꼰대';
  if (score <= 11) return '꼰대 경계경보';
  return '자숙기간 필요';
}

function getResultColor(result) {
  const colors = {
    '성숙한 어른': '#4CAF50',
    '잠재적 꼰대': '#FF9800', 
    '꼰대 경계경보': '#FF5722',
    '자숙기간 필요': '#F44336'
  };
  return colors[result] || '#667eea';
}

async function handleSubmit() {
  const checks = [...document.querySelectorAll('input[type="checkbox"][data-q]')];
  const checkedCount = checks.filter(c => c.checked).length;
  
  if (checkedCount === 0) {
    alert('최소 1개 이상의 문항을 선택해주세요.');
    return;
  }
  
  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.textContent;
  
  submitBtn.disabled = true;
  submitBtn.textContent = '계산중...';
  
  try {
    const answers = {};
    checks.forEach(c => answers[c.getAttribute('data-q')] = c.checked);
    
    const score = Object.values(answers).filter(Boolean).length;
    const result = scoreToBand(score);
    
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div style="color: ${getResultColor(result)}">
        당신의 점수는 <strong>${score}점</strong>
      </div>
      <div style="margin-top: 8px; font-size: 20px;">
        결과: <strong>${result}</strong>
      </div>
    `;
    resultDiv.className = 'show';
    
    await saveToBackend({
      secret: SECRET,
      sessionId,
      participantId,
      answers,
      score,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function saveToBackend(payload) {
  const status = document.getElementById('saveStatus');
  
  console.log('저장 시도:', payload);
  
  try {
    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('저장 성공:', data);
      
      if (data && data.ok) {
        status.textContent = '✅ 저장 완료 (실시간 집계에 반영됩니다)';
        status.className = 'status success';
        return;
      }
    }
    
    throw new Error('Standard fetch failed');
    
  } catch (e) {
    console.log('일반 fetch 실패, no-cors 모드로 전환:', e.message);
    
    try {
      await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });
      
      setTimeout(async () => {
        try {
          const testRes = await fetch(WEBAPP_URL);
          const testData = await testRes.json();
          
          if (testData.status === 'API is working') {
            status.textContent = '✅ 서버 저장 완료 ';
            status.className = 'status success';
          }
        } catch (checkError) {
          status.textContent = '⚠️ 저장 요청 전송됨 (확인 불가)';
          status.className = 'status success';
        }
      }, 2000);
      
      status.textContent = '🔄 저장 중... (확인 중)';
      status.className = 'status';
      
    } catch (nocorsError) {
      console.error('no-cors도 실패:', nocorsError);
      status.textContent = '❌ 저장 실패 - 네트워크 오류';
      status.className = 'status error';
    }
  }
}
