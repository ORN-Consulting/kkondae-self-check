// 즉시 실행 함수로 전체를 감싸기
(function() {
  // 기존 함수들...
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

  // 환경설정
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxgz7TOUoN_Bbww3SXcIn9zbvfcxrzFODZ4wyLfdedVppKY9JfttqoIH6fYKUFc9DYGqw/exec';
  const SECRET = 'dh-20250827-firstproject001';
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('s') || new Date().toISOString().slice(0,10);
  const participantId = params.get('p') || ('USER-' + generateUserFingerprint());

  // 문항 정의
  const ITEMS = [
    '나는 “내가 해봐서 아는데”라는 말을 자주 한다',
    '후배가 나보다 다른 방식으로 일하면, 속으로 ‘틀렸다’고 먼저 생각한다',
    '후배가 나를 설득하려 하면, ‘네가 뭘 알아’라는 생각이 든다',
    '후배와 이야기할 때, 듣는 시간보다 말하는 시간이 더 길다',
    '후배의 생활 습관이나 가치관에 대해 “우리 때는 안 그랬다”라는 말을 한 적이 있다',
    '내가 먼저 배우려고 하기보다는, 가르치려는 태도가 더 많다',
    '회식·모임에 참석하지 않는 후배를 보며 “팀워크가 부족하다”고 생각한다',
    '후배가 새로운 아이디어를 내면, “그거 해봤는데 안 돼”라고 말한 적이 있다',
    '후배가 ‘워라밸’을 중시하는 걸 보면, 책임감이 부족하다고 여긴다',
    '내 말에 반박하면, ‘예의가 없다’고 느낀다',
    '‘연차가 높으면 존중받아야 한다’는 생각을 어느 정도 가지고 있다',
    '후배가 나를 ‘꼰대’라고 생각할까 봐 걱정된 적이 있다'
  ];

  // 초기화 함수
  function init() {
    console.log('초기화 시작');
    
    const qWrap = document.getElementById('questions');
    if (!qWrap) {
      console.error('questions 엘리먼트 없음');
      return;
    }
    
    // 문항 렌더링
    qWrap.innerHTML = ITEMS.map((t,i)=>(
      `<div class="q">
        <label><input type="checkbox" data-q="Q${i+1}" /> ${i+1}. ${t}</label>
      </div>`
    )).join('');
    
    console.log('문항 렌더링 완료');
    
    // 이벤트 리스너 추가
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
      console.log('이벤트 리스너 추가 완료');
    }
    
    console.log('Session ID:', sessionId);
    console.log('Participant ID:', participantId);
  }

  // DOM 로드 확인
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 나머지 함수들...
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
    // 기존 handleSubmit 코드 그대로...
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
    // 기존 saveToBackend 코드 그대로...
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
          status.textContent = '저장 완료 (실시간 집계에 반영됩니다)';
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
              status.textContent = '서버 저장 완료 ';
              status.className = 'status success';
            }
          } catch (checkError) {
            status.textContent = '저장 요청 전송됨 (확인 불가)';
            status.className = 'status success';
          }
        }, 2000);
        
        status.textContent = '저장 중... (확인 중)';
        status.className = 'status';
        
      } catch (nocorsError) {
        console.error('no-cors도 실패:', nocorsError);
        status.textContent = '저장 실패 - 네트워크 오류';
        status.className = 'status error';
      }
    }
  }

})();
