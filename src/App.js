import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  // API 서버 origin (예: http://localhost:3001)
  const [apiOrigin, setApiOrigin] = useState('');
  const [uploadTime, setUploadTime] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState('');
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(null);

  // 테스트 횟수와 파일 선택을 통합 상태로 관리
  const [testCount, setTestCount] = useState(1);
  const [singleFile, setSingleFile] = useState(null);
  const [chunkFile, setChunkFile] = useState(null);

  // 청크 업로드 관련 상태
  const [chunkSize, setChunkSize] = useState(1024 * 1024 * 10); // 10MB 기본값
  const [chunkProgress, setChunkProgress] = useState(0);
  const [chunkUploading, setChunkUploading] = useState(false);
  const [chunkUploadTime, setChunkUploadTime] = useState(null);
  const [chunkResult, setChunkResult] = useState('');

  // 일괄 측정 상태
  const [batchRunning, setBatchRunning] = useState(false);
  const [history, setHistory] = useState([]);

  // 병렬 청크 업로드 개수
  const [parallelCount, setParallelCount] = useState(4);

  // JWT 토큰 상태 추가
  const [jwtToken, setJwtToken] = useState('');

  // Request ID 상태 추가
  const [requestId, setRequestId] = useState('');

  // 커스텀 FormData 필드 상태
  const [customFields, setCustomFields] = useState([{ key: '', value: '' }]);

  // 업로드 중단을 위한 AbortController
  const abortControllerRef = useRef(null);

  // 마크다운 가이드 상태
  const [guideContent, setGuideContent] = useState('');

  // 가이드 내용 로드
  useEffect(() => {
    fetch('/README.md')
      .then(response => response.text())
      .then(text => setGuideContent(text))
      .catch(error => {
        console.error('가이드 로드 실패:', error);
        setGuideContent('# 애플리케이션 정보\n\n가이드를 불러올 수 없습니다.');
      });
  }, []);

  // 업로드 중단 핸들러
  const handleAbortUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setBatchRunning(false);
    setUploading(false);
    setChunkUploading(false);
    setResult('업로드가 중단되었습니다.');
    setChunkResult('업로드가 중단되었습니다.');
  };

  // 커스텀 필드 추가/삭제/변경 핸들러
  const handleCustomFieldChange = (idx, type, val) => {
    setCustomFields(fields => fields.map((f, i) => i === idx ? { ...f, [type]: val } : f));
  };
  const handleAddCustomField = () => {
    setCustomFields(fields => [...fields, { key: '', value: '' }]);
  };
  const handleRemoveCustomField = (idx) => {
    setCustomFields(fields => fields.length === 1 ? fields : fields.filter((_, i) => i !== idx));
  };

  // 커스텀 헤더 상태
  const [customHeaders, setCustomHeaders] = useState([{ key: '', value: '' }]);

  // 커스텀 헤더 추가/삭제/변경 핸들러
  const handleCustomHeaderChange = (idx, type, val) => {
    setCustomHeaders(headers => headers.map((h, i) => i === idx ? { ...h, [type]: val } : h));
  };
  const handleAddCustomHeader = () => {
    setCustomHeaders(headers => [...headers, { key: '', value: '' }]);
  };
  const handleRemoveCustomHeader = (idx) => {
    setCustomHeaders(headers => headers.length === 1 ? headers : headers.filter((_, i) => i !== idx));
  };

  // 커스텀 헤더 객체 생성 (JWT 토큰 우선, chunkIndex/totalChunks 우선 적용 가능)
  // chunkIndex, totalChunks 우선 적용을 위해 인자 허용
  const getCustomHeaders = (extra = {}) => {
    const headerObj = {};
    customHeaders.forEach(h => {
      if (h.key && h.key.toLowerCase() !== 'authorization') headerObj[h.key] = h.value;
    });
    if (jwtToken) headerObj['Authorization'] = 'Bearer ' + jwtToken;
    if (requestId) headerObj['x-request-id'] = requestId;
    // extra(예: chunkIndex, totalChunks)가 있으면 우선 적용
    Object.entries(extra).forEach(([k, v]) => { headerObj[k] = v; });
    return headerObj;
  };

  // 입력 필드 상태를 localStorage에 저장/불러오기
  useEffect(() => {
    const savedOrigin = localStorage.getItem('uploadTestApiOrigin');
    const savedCount = localStorage.getItem('uploadTestCount');
    const savedChunk = localStorage.getItem('uploadTestChunkSize');
    const savedParallel = localStorage.getItem('uploadTestParallelCount');
    const savedJwtToken = localStorage.getItem('uploadTestJwtToken');
    const savedRequestId = localStorage.getItem('uploadTestRequestId');
    const savedCustomFields = localStorage.getItem('uploadTestCustomFields');
    const savedCustomHeaders = localStorage.getItem('uploadTestCustomHeaders');
    if (savedOrigin) setApiOrigin(savedOrigin);
    if (savedCount) setTestCount(Number(savedCount));
    if (savedChunk) setChunkSize(Number(savedChunk));
    if (savedParallel) setParallelCount(Number(savedParallel));
    if (savedJwtToken) setJwtToken(savedJwtToken);
    if (savedRequestId) setRequestId(savedRequestId);
    if (savedCustomFields) {
      try { setCustomFields(JSON.parse(savedCustomFields)); } catch {}
    }
    if (savedCustomHeaders) {
      try { setCustomHeaders(JSON.parse(savedCustomHeaders)); } catch {}
    }
  }, []);

  // customFields, customHeaders 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('uploadTestCustomFields', JSON.stringify(customFields));
  }, [customFields]);
  useEffect(() => {
    localStorage.setItem('uploadTestCustomHeaders', JSON.stringify(customHeaders));
  }, [customHeaders]);

  // 기록 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('uploadTestHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // 기록 저장 함수
  const saveHistory = (record) => {
    const newHistory = [record, ...history].slice(0, 50); // 최대 50개
    setHistory(newHistory);
    localStorage.setItem('uploadTestHistory', JSON.stringify(newHistory));
  };

  // API origin 입력 핸들러
  const handleApiOriginChange = (e) => {
    setApiOrigin(e.target.value);
    localStorage.setItem('uploadTestApiOrigin', e.target.value);
  };

  // 테스트 횟수 입력 핸들러
  const handleTestCountChange = (e) => {
    setTestCount(Number(e.target.value));
    localStorage.setItem('uploadTestCount', e.target.value);
  };
  // 파일 선택 핸들러
  const handleSingleFileChange = (e) => {
    setSingleFile(e.target.files[0]);
    setUploadTime(null);
    setResult('');
    setProgress(0);
  };

  const handleChunkFileChange = (e) => {
    setChunkFile(e.target.files[0]);
    setChunkUploadTime(null);
    setChunkResult('');
    setChunkProgress(0);
  };

  // 청크 크기 변경 핸들러
  const handleChunkSizeChange = (e) => {
    setChunkSize(Number(e.target.value));
    localStorage.setItem('uploadTestChunkSize', e.target.value);
  };

  // 병렬 청크 업로드 개수 변경 핸들러
  const handleParallelCountChange = (e) => {
    setParallelCount(Number(e.target.value));
    localStorage.setItem('uploadTestParallelCount', e.target.value);
  };

  // 병렬 청크 업로드 함수
  async function parallelChunkUpload({ file, chunkSize, fileId, totalChunks, uploadChunkUrl, setChunkProgress, parallelCount, abortController }) {
    let uploadedChunks = 0;
    let chunkStart = 0, chunkEnd = 0;
    const chunkStatus = Array(totalChunks).fill(false);
    const abortControllers = Array(totalChunks).fill(null).map(() => new AbortController());
    let aborted = false;
    let errorMessage = '';

    const uploadOne = async (i) => {
      if (aborted) return;
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const formData = new FormData();
      customFields.forEach(f => { if (f.key) formData.append(f.key, f.value); });
      // 파일만 기본 필드로 추가
      formData.append('file', chunk);
      if (i === 0) chunkStart = performance.now();
      try {
        const res = await fetch(uploadChunkUrl, {
          method: 'POST',
          body: formData,
          headers: getCustomHeaders({ 'x-chunk-index': i, 'x-chunk-total': totalChunks }),
          signal: abortControllers[i].signal,
        });
        if (!res.ok) {
          aborted = true;
          errorMessage = `청크 ${i} 업로드 실패 (status: ${res.status})`;
          abortControllers.forEach(ctrl => ctrl.abort());
          throw new Error(errorMessage);
        }
        if (i === totalChunks - 1) chunkEnd = performance.now();
        chunkStatus[i] = true;
        uploadedChunks++;
        setChunkProgress(Math.round((uploadedChunks / totalChunks) * 100));
      } catch (err) {
        if (err.name === 'AbortError') {
          aborted = true;
          errorMessage = '업로드가 중단되었습니다.';
          abortControllers.forEach(ctrl => ctrl.abort());
        } else if (!aborted) {
          aborted = true;
          errorMessage = err.message || `청크 ${i} 업로드 실패`;
          abortControllers.forEach(ctrl => ctrl.abort());
        }
        throw err;
      }
    };
    // 병렬 업로드 컨트롤
    let next = 0;
    const runners = Array(Math.min(parallelCount, totalChunks)).fill(0).map(async () => {
      while (!aborted && next < totalChunks) {
        // 전역 AbortController 신호 확인
        if (abortController?.signal.aborted) {
          aborted = true;
          errorMessage = '업로드가 중단되었습니다.';
          abortControllers.forEach(ctrl => ctrl.abort());
          break;
        }
        const i = next++;
        try {
          await uploadOne(i);
        } catch {
          break;
        }
      }
    });
    try {
      await Promise.all(runners);
    } catch {}
    if (aborted) {
      setChunkResult(errorMessage || '청크 업로드 중단');
      return { chunkStart, chunkEnd, success: false };
    }
    return { chunkStart, chunkEnd, success: true };
  }

  // 일괄 측정 핸들러
  const handleBatchTest = async (e) => {
    e.preventDefault();
    setBatchRunning(true);
    setResult('');
    setUploadTime(null);
    setUploading(true);
    setChunkResult('');
    setChunkUploadTime(null);
    setChunkUploading(true);
    setProgress(0);
    setChunkProgress(0);
    
    // AbortController 초기화
    abortControllerRef.current = new AbortController();
    
    // 단일 업로드
    let singleTimes = [];
    if (singleFile) {
      for (let i = 0; i < testCount; i++) {
        // 중단 신호 확인
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        await new Promise((resolve) => {
          const formData = new FormData();
          formData.append('file', singleFile);
          customFields.forEach(f => { if (f.key) formData.append(f.key, f.value); });
          const xhr = new window.XMLHttpRequest();
          xhr.open('POST', apiOrigin.replace(/\/$/, '') + singleUploadPath);
          const headers = getCustomHeaders();
          Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setProgress(percent);
            }
          };
          xhr.onloadstart = () => {
            startTimeRef.current = performance.now();
          };
          xhr.onload = () => {
            const endTime = performance.now();
            const elapsed = Math.round(endTime - startTimeRef.current);
            setUploadTime(elapsed);
            singleTimes.push(elapsed);
            if (xhr.status >= 200 && xhr.status < 300) {
              setResult('업로드 성공!');
            } else {
              setResult('업로드 실패: ' + xhr.status);
            }
            resolve();
          };
          xhr.onerror = () => {
            setResult('업로드 중 오류 발생');
            resolve();
          };
          xhr.onabort = () => {
            setResult('업로드가 중단되었습니다.');
            resolve();
          };
          xhr.send(formData);
          
          // 중단 신호 감지 시 XHR 중단
          if (abortControllerRef.current?.signal.aborted) {
            xhr.abort();
          }
        });
      }
    }
    setUploading(false);
    
    // 중단 신호 확인
    if (abortControllerRef.current?.signal.aborted) {
      setBatchRunning(false);
      return;
    }
    
    // 청크 업로드 (병렬)
    let chunkTimes = [];
    if (chunkFile) {
      for (let t = 0; t < testCount; t++) {
        // 중단 신호 확인
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        const totalChunks = Math.ceil(chunkFile.size / chunkSize);
        const fileId = `${chunkFile.name}-${chunkFile.size}-${chunkFile.lastModified}-${Date.now()}-${t}`;
        const uploadChunkUrl = apiOrigin.replace(/\/$/, '') + uploadChunkPath;
        const mergeChunksUrl = apiOrigin.replace(/\/$/, '') + mergeChunksPath;
        // 병렬 업로드 실행
        let mergeOk = false;
        const { chunkStart, chunkEnd, success: chunkUploadSuccess } = await parallelChunkUpload({ 
          file: chunkFile, 
          chunkSize, 
          fileId, 
          totalChunks, 
          uploadChunkUrl, 
          setChunkProgress, 
          parallelCount,
          abortController: abortControllerRef.current 
        });
        // 청크 업로드가 모두 성공했을 때만 병합 요청
        if (chunkUploadSuccess && chunkEnd && chunkStart) {
          try {
            const mergeRes = await fetch(mergeChunksUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getCustomHeaders({ 'x-chunk-total': totalChunks }),
              },
              body: JSON.stringify({
                fileId,
                filename: chunkFile.name,
                totalChunks,
                ...Object.fromEntries(customFields.filter(f => f.key).map(f => [f.key, f.value]))
              }),
              signal: abortControllerRef.current?.signal,
            });
            mergeOk = mergeRes.ok;
            if (mergeRes.ok) {
              setChunkResult('청크 업로드 및 병합 성공!');
            } else {
              setChunkResult('병합 실패: ' + (mergeRes.status));
            }
          } catch (err) {
            if (err.name === 'AbortError') {
              setChunkResult('업로드가 중단되었습니다.');
              break;
            }
            setChunkResult('병합 요청 중 오류 발생');
          }
          // chunkEnd - chunkStart만 기록
          if (chunkStart && chunkEnd && mergeOk) {
            const elapsed = Math.round(chunkEnd - chunkStart);
            setChunkUploadTime(elapsed);
            chunkTimes.push(elapsed);
          }
        }
      }
    }
    setChunkUploading(false);
    setBatchRunning(false);
    
    // 중단된 경우 기록 저장하지 않음
    if (abortControllerRef.current?.signal.aborted) {
      return;
    }
    
    // 기록 저장
    const now = new Date();
    const record = {
      date: now.toLocaleString(),
      count: testCount,
      avgSingle: singleTimes.length ? Math.round(singleTimes.reduce((a, b) => a + b, 0) / singleTimes.length) : null,
      avgChunk: chunkTimes.length ? Math.round(chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length) : null,
      avgSingleSpeed: singleTimes.length ? Math.round(singleFile.size / (singleTimes.reduce((a, b) => a + b, 0) / singleTimes.length) * 1000) : null, // bytes/sec
      avgChunkSpeed: chunkTimes.length ? Math.round(chunkFile.size / (chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length) * 1000) : null, // bytes/sec
      url: apiOrigin,
      chunkSize,
      singleFileName: singleFile?.name || '-',
      chunkFileName: chunkFile?.name || '-',
      singleFileSize: singleFile?.size || 0,
      chunkFileSize: chunkFile?.size || 0
    };
    saveHistory(record);
  };

  // 측정 기록 지우기 버튼 핸들러
  const handleClearHistory = () => {
    localStorage.removeItem('uploadTestHistory');
    setHistory([]);
  };

  // path 입력 상태 추가
  const [singleUploadPath, setSingleUploadPath] = useState('/upload');
  const [uploadChunkPath, setUploadChunkPath] = useState('/upload-chunk');
  const [mergeChunksPath, setMergeChunksPath] = useState('/merge-chunks');

  // path 입력 필드 localStorage 불러오기
  useEffect(() => {
    const savedSingleUploadPath = localStorage.getItem('uploadTestSingleUploadPath');
    const savedUploadChunkPath = localStorage.getItem('uploadTestUploadChunkPath');
    const savedMergeChunksPath = localStorage.getItem('uploadTestMergeChunksPath');
    if (savedSingleUploadPath) setSingleUploadPath(savedSingleUploadPath);
    if (savedUploadChunkPath) setUploadChunkPath(savedUploadChunkPath);
    if (savedMergeChunksPath) setMergeChunksPath(savedMergeChunksPath);
  }, []);

  // JWT 토큰 입력 핸들러
  const handleJwtTokenChange = (e) => {
    setJwtToken(e.target.value);
    localStorage.setItem('uploadTestJwtToken', e.target.value);
  };

  // Request ID 입력 핸들러
  const handleRequestIdChange = (e) => {
    setRequestId(e.target.value);
    localStorage.setItem('uploadTestRequestId', e.target.value);
  };

  // path 입력 핸들러
  const handleSingleUploadPathChange = (e) => {
    setSingleUploadPath(e.target.value);
    localStorage.setItem('uploadTestSingleUploadPath', e.target.value);
  };
  const handleUploadChunkPathChange = (e) => {
    setUploadChunkPath(e.target.value);
    localStorage.setItem('uploadTestUploadChunkPath', e.target.value);
  };
  const handleMergeChunksPathChange = (e) => {
    setMergeChunksPath(e.target.value);
    localStorage.setItem('uploadTestMergeChunksPath', e.target.value);
  };

  const fileInputRef = useRef();

  return (
    <div className="App" style={{ maxWidth: 1400, margin: '40px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      {/* 상단 통합 입력란과 업로드 가이드 */}
      <div style={{
        marginBottom: 40,
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '32px',
        alignItems: 'start',
      }}>
        {/* 기존 입력 필드들을 wrapper로 감싸기 */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
          padding: 32,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridTemplateRows: 'repeat(9, auto)',
            gap: '24px',
            alignItems: 'end',
          }}>
            {/* 1행: 테스트 횟수, 병렬 업로드 개수, 청크크기 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 100, gridColumn: '1/3', gridRow: '1/2' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>테스트 횟수</span>
              <input
                type="number"
                value={testCount}
                onChange={handleTestCountChange}
                min={1}
                step={1}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '3/5', gridRow: '1/2' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>병렬 업로드 개수</span>
              <input
                type="number"
                value={parallelCount}
                onChange={handleParallelCountChange}
                min={1}
                max={16}
                step={1}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '5/7', gridRow: '1/2' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>청크 크기 (byte)</span>
              <input
                type="number"
                value={chunkSize}
                onChange={handleChunkSizeChange}
                min={1024}
                step={1024}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            {/* 2행: API 서버 Origin, 단일 업로드 Path, 청크 업로드 Path */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180, gridColumn: '1/3', gridRow: '2/3' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>API 서버 Origin</span>
              <input
                type="text"
                value={apiOrigin}
                onChange={handleApiOriginChange}
                placeholder="예: http://localhost:3001"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '3/5', gridRow: '2/3' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>단일 업로드 Path</span>
              <input
                type="text"
                value={singleUploadPath}
                onChange={handleSingleUploadPathChange}
                placeholder="예: /upload"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '5/7', gridRow: '2/3' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>청크 업로드 Path</span>
              <input
                type="text"
                value={uploadChunkPath}
                onChange={handleUploadChunkPathChange}
                placeholder="예: /upload-chunk"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            {/* 3행: 청크 병합 Path, JWT 토큰, Request ID */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '1/3', gridRow: '3/4' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>청크 병합 Path</span>
              <input
                type="text"
                value={mergeChunksPath}
                onChange={handleMergeChunksPathChange}
                placeholder="예: /merge-chunks"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180, gridColumn: '3/5', gridRow: '3/4' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>JWT 토큰 (Bearer)</span>
              <input
                type="text"
                value={jwtToken}
                onChange={handleJwtTokenChange}
                placeholder="JWT 토큰 입력"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180, gridColumn: '5/7', gridRow: '3/4' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>Request ID</span>
              <input
                type="text"
                value={requestId}
                onChange={handleRequestIdChange}
                placeholder="요청 ID 입력"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
              />
            </div>
            {/* 4행: Instruction 업로드 파일 (3 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: '1/4', gridRow: '4/5', border: '2px solid #e0e0e0', borderRadius: 12, padding: '20px', backgroundColor: '#fafafa' }}>
              <span style={{ fontSize: 15, marginBottom: 16, fontWeight: 500, color: '#333', textAlign: 'center' }}>Instruction 업로드 파일</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleSingleFileChange}
                  style={{ display: 'none' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px 0 rgba(25,118,210,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseOver={e => e.target.style.background = '#1565c0'}
                  onMouseOut={e => e.target.style.background = '#1976d2'}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M16.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"/><path stroke="#fff" strokeWidth="1.5" d="M12 16.5V19m-7 1.5h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.28a2 2 0 0 1-1.42-.59l-2.43-2.43a2 2 0 0 0-1.42-.58h-2.72a2 2 0 0 0-1.42.58l-2.43 2.43A2 2 0 0 1 4.28 9H3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Z"/></svg>
                  파일 선택
                </button>
                {singleFile && (
                  <span style={{ fontSize: 13, color: '#1976d2', fontWeight: 500, wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%' }}>{singleFile.name}</span>
                )}
              </div>
            </div>
            {/* 4행: 청크 업로드 파일 (3 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: '4/7', gridRow: '4/5', border: '2px solid #e0e0e0', borderRadius: 12, padding: '20px', backgroundColor: '#fafafa' }}>
              <span style={{ fontSize: 15, marginBottom: 16, fontWeight: 500, color: '#333', textAlign: 'center' }}>청크 업로드 파일</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                <input
                  type="file"
                  onChange={handleChunkFileChange}
                  style={{ display: 'none' }}
                  id="chunkFileInput"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('chunkFileInput').click()}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px 0 rgba(25,118,210,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseOver={e => e.target.style.background = '#1565c0'}
                  onMouseOut={e => e.target.style.background = '#1976d2'}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M16.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"/><path stroke="#fff" strokeWidth="1.5" d="M12 16.5V19m-7 1.5h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.28a2 2 0 0 1-1.42-.59l-2.43-2.43a2 2 0 0 0-1.42-.58h-2.72a2 2 0 0 0-1.42.58l-2.43 2.43A2 2 0 0 1 4.28 9H3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Z"/></svg>
                  파일 선택
                </button>
                {chunkFile && (
                  <span style={{ fontSize: 13, color: '#1976d2', fontWeight: 500, wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%' }}>{chunkFile.name}</span>
                )}
              </div>
            </div>
            {/* 5행: 커스텀 FormData 필드 (2 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gridColumn: '1/3', gridRow: '5/6' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>커스텀 FormData 필드 (옵션)</span>
              <div style={{ width: '100%' }}>
                {customFields.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="key"
                      value={f.key}
                      onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
                    />
                    <span style={{ fontWeight: 500, color: '#888', fontSize: 12 }}>=</span>
                    <input
                      type="text"
                      placeholder="value"
                      value={f.value}
                      onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      style={{ marginLeft: 2, background: '#eee', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#d32f2f', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}
                      disabled={customFields.length === 1}
                    >
                      삭제
                    </button>
                    {idx === customFields.length - 1 && (
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        style={{ marginLeft: 2, background: '#1976d2', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        +추가
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* 5행: 커스텀 헤더 (3 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gridColumn: '3/6', gridRow: '5/6' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>커스텀 헤더 (옵션)</span>
              <div style={{ width: '100%' }}>
                {customHeaders.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="key"
                      value={h.key}
                      onChange={e => handleCustomHeaderChange(idx, 'key', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
                    />
                    <span style={{ fontWeight: 500, color: '#888', fontSize: 12 }}>=</span>
                    <input
                      type="text"
                      placeholder="value"
                      value={h.value}
                      onChange={e => handleCustomHeaderChange(idx, 'value', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomHeader(idx)}
                      style={{ marginLeft: 2, background: '#eee', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#d32f2f', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}
                      disabled={customHeaders.length === 1}
                    >
                      삭제
                    </button>
                    {idx === customHeaders.length - 1 && (
                      <button
                        type="button"
                        onClick={handleAddCustomHeader}
                        style={{ marginLeft: 2, background: '#1976d2', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        +추가
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* 6행: 버튼들 */}
            <div style={{ gridColumn: '1/3', gridRow: '6/7', display: 'flex', alignItems: 'end' }}>
              <button
                onClick={handleBatchTest}
                disabled={batchRunning || (!singleFile && !chunkFile) || !apiOrigin}
                style={{
                  padding: '14px 24px',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 8,
                  background: batchRunning ? '#bdbdbd' : '#1976d2',
                  color: '#fff',
                  border: 'none',
                  boxShadow: batchRunning ? 'none' : '0 2px 8px 0 rgba(25,118,210,0.08)',
                  cursor: batchRunning ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  width: '100%',
                  minWidth: 120,
                  marginLeft: 0,
                }}
                onMouseOver={e => { if (!batchRunning) e.target.style.background = '#1565c0'; }}
                onMouseOut={e => { if (!batchRunning) e.target.style.background = '#1976d2'; }}
              >
                {batchRunning ? '측정 중...' : '일괄 측정 시작'}
              </button>
            </div>
            <div style={{ gridColumn: '3/5', gridRow: '6/7', display: 'flex', alignItems: 'end' }}>
              <button
                onClick={handleAbortUpload}
                disabled={!batchRunning}
                style={{
                  padding: '14px 24px',
                  borderRadius: 8,
                  background: batchRunning ? '#d32f2f' : '#bdbdbd',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: batchRunning ? 'pointer' : 'not-allowed',
                  boxShadow: batchRunning ? '0 1px 4px 0 rgba(211,47,47,0.07)' : 'none',
                  transition: 'background 0.2s',
                  width: '100%',
                  minWidth: 120,
                  marginLeft: 0,
                }}
                onMouseOver={e => { if (batchRunning) e.target.style.background = '#c62828'; }}
                onMouseOut={e => { if (batchRunning) e.target.style.background = '#d32f2f'; }}
              >
                측정 중지
              </button>
            </div>
            <div style={{ gridColumn: '5/7', gridRow: '6/7', display: 'flex', alignItems: 'end' }}>
              <button
                onClick={handleClearHistory}
                style={{
                  padding: '14px 24px',
                  borderRadius: 8,
                  background: '#757575',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px 0 rgba(117,117,117,0.07)',
                  transition: 'background 0.2s',
                  width: '100%',
                  minWidth: 120,
                  marginLeft: 0,
                }}
                onMouseOver={e => e.target.style.background = '#424242'}
                onMouseOut={e => e.target.style.background = '#757575'}
              >
                측정 기록 지우기
              </button>
            </div>
          </div>
        </div>

        {/* 애플리케이션 정보 */}
        <div style={{
          background: '#f8fafd',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 12px 0 rgba(25,118,210,0.06)',
          border: '1px solid #e3eafc',
        }}>
          <h2 style={{ 
            fontSize: 20, 
            fontWeight: 600, 
            color: '#333', 
            marginBottom: 16,
            borderBottom: '2px solid #1976d2',
            paddingBottom: 8
          }}>
            📖 애플리케이션 정보
          </h2>
          <div className="guide-container" style={{ 
            fontSize: 14, 
            lineHeight: 1.6, 
            color: '#555',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <ReactMarkdown>{guideContent}</ReactMarkdown>
          </div>
        </div>
      </div>
      {/* 결과/진행률 영역 */}
      {/* 단일 업로드 결과 */}
      {uploading && (
        <div style={{ marginTop: 24 }}>
          <div style={{ height: 18, background: '#e3eafc', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px 0 rgba(25,118,210,0.07)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)', transition: 'width 0.2s' }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 15, color: '#1976d2', fontWeight: 500 }}>{progress}%</div>
        </div>
      )}
      {uploadTime !== null && (
        <div style={{ marginTop: 24, fontWeight: 'bold', fontSize: 17, color: '#1976d2' }}>
          Instruction 업로드 소요 시간: {uploadTime} ms
        </div>
      )}
      {result && (
        <div style={{ marginTop: 16, color: result.includes('성공') ? '#388e3c' : '#d32f2f', fontWeight: 600, fontSize: 16 }}>
          {result}
        </div>
      )}
      {/* 청크 업로드 결과 */}
      {chunkUploading && (
        <div style={{ marginTop: 24 }}>
          <div style={{ height: 18, background: '#e3eafc', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px 0 rgba(25,118,210,0.07)' }}>
            <div style={{ width: `${chunkProgress}%`, height: '100%', background: 'linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)', transition: 'width 0.2s' }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 15, color: '#1976d2', fontWeight: 500 }}>{chunkProgress}%</div>
        </div>
      )}
      {chunkUploadTime !== null && (
        <div style={{ marginTop: 24, fontWeight: 'bold', fontSize: 17, color: '#1976d2' }}>
          청크 업로드 소요 시간: {chunkUploadTime} ms
        </div>
      )}
      {chunkResult && (
        <div style={{ marginTop: 16, color: chunkResult.includes('성공') ? '#388e3c' : '#d32f2f', fontWeight: 600, fontSize: 16 }}>
          {chunkResult}
        </div>
      )}
      {/* 기록 테이블 */}
      {history.length > 0 && (
        <div style={{ marginTop: 56, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.07)', padding: 32 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 16, fontSize: 18, color: '#1976d2' }}>측정 기록</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, background: '#fff' }}>
              <thead>
                <tr style={{ background: '#e3eafc', color: '#1976d2' }}>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>날짜</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>횟수</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>Instruction 평균(ms)</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>Instruction 속도(B/s)</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>청크 평균(ms)</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>청크 속도(B/s)</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>URL</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>청크 크기</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>Instruction 파일명</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>Instruction 크기</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>청크 파일명</th>
                  <th style={{ padding: 10, border: '1px solid #e3eafc', fontWeight: 700 }}>청크 크기</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafd' : '#fff', transition: 'background 0.2s' }}>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.date}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.count}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.avgSingle ?? '-'}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.avgSingleSpeed ?? '-'}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.avgChunk ?? '-'}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.avgChunkSpeed ?? '-'}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.chunkSize}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.singleFileName}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.singleFileSize}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.chunkFileName}</td>
                    <td style={{ padding: 10, border: '1px solid #f0f0f0' }}>{h.chunkFileSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
