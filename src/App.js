import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // API 서버 origin (예: http://localhost:3001)
  const [apiOrigin, setApiOrigin] = useState('');
  const [uploadTime, setUploadTime] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState('');
  const [progress, setProgress] = useState(0);
  const [testProgresses, setTestProgresses] = useState([]);
  const startTimeRef = useRef(null);

  // 테스트 횟수와 파일 선택을 통합 상태로 관리
  const [testCount, setTestCount] = useState(1);
  const [singleFile, setSingleFile] = useState(null);
  const [chunkFile, setChunkFile] = useState(null);

  // 청크 업로드 관련 상태
  const [chunkSize, setChunkSize] = useState(10); // 10MB 기본값 (MB 단위)
  const [chunkProgress, setChunkProgress] = useState(0);
  const [chunkTestProgresses, setChunkTestProgresses] = useState([]);
  const [chunkUploading, setChunkUploading] = useState(false);
  const [chunkUploadTime, setChunkUploadTime] = useState(null);
  const [chunkResult, setChunkResult] = useState('');

  // 네트워크 속도 계산을 위한 상태
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [chunkUploadStartTime, setChunkUploadStartTime] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [chunkCurrentSpeed, setChunkCurrentSpeed] = useState(0);

  // 일괄 측정 상태
  const [batchRunning, setBatchRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // 병렬 청크 업로드 개수
  const [parallelCount, setParallelCount] = useState(4);

  // JWT 토큰 상태 추가
  const [jwtToken, setJwtToken] = useState('');

  // Request ID 발급 Path 상태 추가
  const [requestIdPath, setRequestIdPath] = useState('/v1/translation-re/init');

  // Request ID 발급용 POST body 상태 추가
  const [requestIdBody, setRequestIdBody] = useState({
    language: 'KO',
    target_language: ['EN'],
    dir_name: '',
    ext: ''
  });

  // 커스텀 FormData 필드 상태
  const [customFields, setCustomFields] = useState([{ key: '', value: '' }]);

  // 업로드 중단을 위한 AbortController
  const abortControllerRef = useRef(null);



  // 업로드 중단 핸들러
  const handleAbortUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setBatchRunning(false);
    setUploading(false);
    setChunkUploading(false);
    setProgress(0); // 프로그레스 바 초기화
    setChunkProgress(0); // 청크 프로그레스 바 초기화
    const abortMsg = '업로드가 중단되었습니다.';
    setErrorMessage(abortMsg);
    setResult(abortMsg);
    setChunkResult(abortMsg);
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



  // 입력 필드 상태를 localStorage에 저장/불러오기
  useEffect(() => {
    const savedOrigin = localStorage.getItem('uploadTestApiOrigin');
    const savedCount = localStorage.getItem('uploadTestCount');
    const savedChunk = localStorage.getItem('uploadTestChunkSize');
    const savedParallel = localStorage.getItem('uploadTestParallelCount');
    const savedJwtToken = localStorage.getItem('uploadTestJwtToken');
    const savedRequestIdPath = localStorage.getItem('uploadTestRequestIdPath');
    const savedRequestIdBody = localStorage.getItem('uploadTestRequestIdBody');
    const savedCustomFields = localStorage.getItem('uploadTestCustomFields');
    const savedCustomHeaders = localStorage.getItem('uploadTestCustomHeaders');
    if (savedOrigin) setApiOrigin(savedOrigin);
    if (savedCount) setTestCount(Number(savedCount));
    if (savedChunk) setChunkSize(Number(savedChunk));
    if (savedParallel) setParallelCount(Number(savedParallel));
    if (savedJwtToken) setJwtToken(savedJwtToken);
    if (savedRequestIdPath) setRequestIdPath(savedRequestIdPath);
    if (savedRequestIdBody) {
      try { setRequestIdBody(JSON.parse(savedRequestIdBody)); } catch { }
    }
    if (savedCustomFields) {
      try { setCustomFields(JSON.parse(savedCustomFields)); } catch { }
    }
    if (savedCustomHeaders) {
      try { setCustomHeaders(JSON.parse(savedCustomHeaders)); } catch { }
    }
  }, []);

  // customFields, customHeaders 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('uploadTestCustomFields', JSON.stringify(customFields));
  }, [customFields]);
  useEffect(() => {
    localStorage.setItem('uploadTestCustomHeaders', JSON.stringify(customHeaders));
  }, [customHeaders]);

  // requestIdBody 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('uploadTestRequestIdBody', JSON.stringify(requestIdBody));
  }, [requestIdBody]);

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
    const file = e.target.files[0];
    setChunkFile(file);
    setChunkUploadTime(null);
    setChunkResult('');
    setChunkProgress(0);

    // 파일에서 dir_name과 ext 추출
    if (file) {
      const fileName = file.name;
      const lastDotIndex = fileName.lastIndexOf('.');
      const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';

      // 파일명에서 확장자를 제외한 부분을 dir_name으로 사용
      const dirName = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;

      setRequestIdBody(prev => ({
        ...prev,
        dir_name: dirName,
        ext: ext
      }));
    }
  };

  // 청크 크기 변경 핸들러
  const handleChunkSizeChange = (e) => {
    const newChunkSize = Number(e.target.value);
    setChunkSize(newChunkSize);
    localStorage.setItem('uploadTestChunkSize', e.target.value);

    // 디버깅: 청크 크기 변경 로그
    console.log(`[DEBUG] 청크 크기 변경: ${newChunkSize} MB = ${(newChunkSize * 1024 * 1024).toLocaleString()} bytes`);
  };

  // 청크 크기 변환 유틸리티 함수
  const convertMBToBytes = (mb) => mb * 1024 * 1024;
  const convertBytesToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

  // 네트워크 속도 계산 함수
  const calculateSpeed = (bytes, startTime) => {
    if (!startTime) return 0;
    const elapsed = (Date.now() - startTime) / 1000; // 초 단위
    return elapsed > 0 ? bytes / elapsed : 0;
  };

  const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0) return '-';
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
    } else if (bytesPerSec >= 1024) {
      return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
    } else {
      return `${bytesPerSec.toFixed(0)} B/s`;
    }
  };

  // 병렬 청크 업로드 개수 변경 핸들러
  const handleParallelCountChange = (e) => {
    setParallelCount(Number(e.target.value));
    localStorage.setItem('uploadTestParallelCount', e.target.value);
  };

  // 병렬 청크 업로드 함수
  async function parallelChunkUpload({ file, chunkSizeInBytes, fileId, totalChunks, uploadChunkUrl, setChunkProgress, parallelCount, abortController, getHeadersWithRequestId, requestId, testIndex }) {
    let uploadedChunks = 0;
    let chunkStart = 0, chunkEnd = 0;
    const chunkStatus = Array(totalChunks).fill(false);
    const abortControllers = Array(totalChunks).fill(null).map(() => new AbortController());
    let aborted = false;
    let errorMessage = '';

    // 디버깅: 청크 크기 정보 출력
    console.log(`[DEBUG] 청크 업로드 시작 - 파일 크기: ${file.size} bytes, 청크 크기: ${chunkSizeInBytes} bytes, 총 청크 수: ${totalChunks}`);

    const uploadOne = async (i) => {
      if (aborted) return;
      const start = i * chunkSizeInBytes;
      const end = Math.min(file.size, start + chunkSizeInBytes);
      const chunk = file.slice(start, end);

      // 디버깅: 각 청크의 크기 정보 출력
      console.log(`[DEBUG] 청크 ${i} - 시작: ${start}, 끝: ${end}, 크기: ${chunk.size} bytes`);

      const formData = new FormData();
      customFields.forEach(f => { if (f.key) formData.append(f.key, f.value); });
      // 파일만 기본 필드로 추가
      formData.append('file', chunk);
      if (i === 0) chunkStart = performance.now();
      try {
        const res = await fetch(uploadChunkUrl, {
          method: 'POST',
          body: formData,
          headers: getHeadersWithRequestId(requestId, { 'x-chunk-index': i, 'x-chunk-total': totalChunks }),
          signal: abortControllers[i].signal,
        });
        if (!res.ok) {
          aborted = true;
          errorMessage = `청크 ${i} 업로드 실패 (status: ${res.status})`;
          abortControllers.forEach(ctrl => ctrl.abort());
          // 에러 발생 시 전체 업로드 중단
          if (abortController) {
            abortController.abort();
          }
          throw new Error(errorMessage);
        }
        if (i === totalChunks - 1) chunkEnd = performance.now();
        chunkStatus[i] = true;
        uploadedChunks++;
        const chunkPercent = Math.round((uploadedChunks / totalChunks) * 100);
        setChunkTestProgresses(prev => {
          const newProgresses = [...prev];
          newProgresses[testIndex] = chunkPercent;
          return newProgresses;
        });
        // 전체 평균 프로그레스도 업데이트
        setChunkTestProgresses(prev => {
          const newProgresses = [...prev];
          newProgresses[testIndex] = chunkPercent;
          const avgProgress = Math.round(newProgresses.reduce((sum, p) => sum + p, 0) / newProgresses.length);
          setChunkProgress(avgProgress);

          // 실시간 속도 계산
          if (chunkFile && chunkUploadStartTime) {
            const processedBytes = (chunkFile.size * avgProgress) / 100;
            const speed = calculateSpeed(processedBytes, chunkUploadStartTime);
            setChunkCurrentSpeed(speed);
          }

          return newProgresses;
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          aborted = true;
          errorMessage = '업로드가 중단되었습니다.';
          abortControllers.forEach(ctrl => ctrl.abort());
        } else if (!aborted) {
          aborted = true;
          errorMessage = err.message || `청크 ${i} 업로드 실패`;
          abortControllers.forEach(ctrl => ctrl.abort());
          // 에러 발생 시 전체 업로드 중단
          if (abortController) {
            abortController.abort();
          }
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
    } catch { }
    if (aborted) {
      const errorMsg = errorMessage || '청크 업로드 중단';
      setErrorMessage(errorMsg);
      setChunkResult(errorMsg);
      setChunkProgress(0); // 청크 프로그레스 바 초기화
      return { chunkStart, chunkEnd, success: false };
    }
    return { chunkStart, chunkEnd, success: true };
  }

  // 일괄 측정 핸들러
  const handleBatchTest = async (e) => {
    e.preventDefault();

    setBatchRunning(true);
    setResult('');
    setErrorMessage('');
    setUploadTime(null);
    setChunkResult('');
    setChunkUploadTime(null);
    setProgress(0);
    setChunkProgress(0);
    setCurrentSpeed(0);
    setChunkCurrentSpeed(0);
    // 각 테스트별 프로그레스 바 초기화
    setTestProgresses(Array(testCount).fill(0));
    setChunkTestProgresses(Array(testCount).fill(0));

    // 파일 선택 여부에 따라 업로드 상태 설정
    if (singleFile) {
      setUploading(true);
      setUploadStartTime(Date.now());
    }
    if (chunkFile) {
      setChunkUploading(true);
      setChunkUploadStartTime(Date.now());
    }

    // AbortController 초기화
    abortControllerRef.current = new AbortController();

    // 커스텀 헤더 생성 함수 (Request ID 포함)
    const getHeadersWithRequestId = (requestId, extra = {}) => {
      const headerObj = {};
      customHeaders.forEach(h => {
        if (h.key && h.key.toLowerCase() !== 'authorization') headerObj[h.key] = h.value;
      });
      if (jwtToken) headerObj['Authorization'] = 'Bearer ' + jwtToken;
      if (requestId) headerObj['x-request-id'] = requestId;
      Object.entries(extra).forEach(([k, v]) => { headerObj[k] = v; });
      return headerObj;
    };

    // Request ID 발급 (각 테스트마다 병렬로)
    let requestIds = [];
    if (requestIdPath) {
      const requestIdPromises = Array.from({ length: testCount }, async (_, i) => {
        // 중단 신호 확인
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        try {
          const response = await fetch(apiOrigin.replace(/\/$/, '') + requestIdPath, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(customHeaders.filter(h => h.key && h.key.toLowerCase() !== 'authorization').map(h => [h.key, h.value])),
              ...(jwtToken && { 'Authorization': 'Bearer ' + jwtToken })
            },
            body: JSON.stringify(requestIdBody),
            signal: abortControllerRef.current?.signal,
          });

          if (response.ok) {
            const data = await response.json();
            const requestId = data.data?.request_id || null;
            console.log(`테스트 ${i + 1} 발급된 Request ID:`, requestId);
            return requestId;
          } else {
            console.error(`테스트 ${i + 1} Request ID 발급 실패:`, response.status);
            // Request ID 발급 실패 시 전체 업로드 중단
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            setUploading(false);
            setChunkUploading(false);
            setProgress(0);
            setChunkProgress(0);
            const errorMsg = `Request ID 발급 실패: ${response.status}`;
            setErrorMessage(errorMsg);
            setResult(errorMsg);
            setChunkResult(errorMsg);
            return null;
          }
        } catch (error) {
          console.error(`테스트 ${i + 1} Request ID 발급 중 오류:`, error);
          // Request ID 발급 중 오류 시 전체 업로드 중단
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          setUploading(false);
          setChunkUploading(false);
          setProgress(0);
          setChunkProgress(0);
          const errorMsg = 'Request ID 발급 중 오류 발생';
          setErrorMessage(errorMsg);
          setResult(errorMsg);
          setChunkResult(errorMsg);
          return null;
        }
      });

      requestIds = await Promise.all(requestIdPromises);
    } else {
      requestIds = Array(testCount).fill(null);
    }

    // 중단된 경우 업로드 중단
    if (abortControllerRef.current?.signal.aborted) {
      setUploading(false);
      setChunkUploading(false);
      setBatchRunning(false);
      setProgress(0);
      setChunkProgress(0);
      setTestProgresses(Array(testCount).fill(0));
      setChunkTestProgresses(Array(testCount).fill(0));
      const abortMsg = '업로드가 중단되었습니다.';
      setErrorMessage(abortMsg);
      setResult(abortMsg);
      setChunkResult(abortMsg);
      return;
    }

    // Preflight 요청 (각 테스트마다 병렬로)
    if (preflightPath && chunkFile) {
      const preflightPromises = Array.from({ length: testCount }, async (_, i) => {
        // 중단 신호 확인
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        const requestId = requestIds[i];
        if (!requestId) {
          console.error(`테스트 ${i + 1} Request ID가 없어 preflight 요청을 건너뜁니다.`);
          return null;
        }

        try {
          const response = await fetch(apiOrigin.replace(/\/$/, '') + preflightPath, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(customHeaders.filter(h => h.key && h.key.toLowerCase() !== 'authorization').map(h => [h.key, h.value])),
              ...(jwtToken && { 'Authorization': 'Bearer ' + jwtToken })
            },
            body: JSON.stringify({
              request_id: requestId,
              file_size: chunkFile.size
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (response.status === 400) {
            console.error(`테스트 ${i + 1} Preflight 실패: 가용량 부족`);
            // Preflight 실패 시 전체 업로드 중단
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            setUploading(false);
            setChunkUploading(false);
            setProgress(0);
            setChunkProgress(0);
            const errorMsg = '가용량 부족으로 업로드를 중단합니다.';
            setErrorMessage(errorMsg);
            setResult(errorMsg);
            setChunkResult(errorMsg);
            return null;
          } else if (response.ok) {
            console.log(`테스트 ${i + 1} Preflight 성공`);
            return true;
          } else {
            console.error(`테스트 ${i + 1} Preflight 실패:`, response.status);
            // Preflight 실패 시 전체 업로드 중단
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            setUploading(false);
            setChunkUploading(false);
            setProgress(0);
            setChunkProgress(0);
            const errorMsg = `Preflight 실패: ${response.status}`;
            setErrorMessage(errorMsg);
            setResult(errorMsg);
            setChunkResult(errorMsg);
            return null;
          }
        } catch (error) {
          console.error(`테스트 ${i + 1} Preflight 중 오류:`, error);
          // Preflight 중 오류 시 전체 업로드 중단
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          setUploading(false);
          setChunkUploading(false);
          setProgress(0);
          setChunkProgress(0);
          const errorMsg = 'Preflight 중 오류 발생';
          setErrorMessage(errorMsg);
          setResult(errorMsg);
          setChunkResult(errorMsg);
          return null;
        }
      });

      const preflightResults = await Promise.all(preflightPromises);
      
      // Preflight 실패가 있으면 업로드 중단
      if (preflightResults.some(result => result === null)) {
        setUploading(false);
        setChunkUploading(false);
        setBatchRunning(false);
        setProgress(0);
        setChunkProgress(0);
        setTestProgresses(Array(testCount).fill(0));
        setChunkTestProgresses(Array(testCount).fill(0));
        return;
      }
    }

    // 중단된 경우 업로드 중단
    if (abortControllerRef.current?.signal.aborted) {
      setUploading(false);
      setChunkUploading(false);
      setBatchRunning(false);
      setProgress(0);
      setChunkProgress(0);
      setTestProgresses(Array(testCount).fill(0));
      setChunkTestProgresses(Array(testCount).fill(0));
      const abortMsg = '업로드가 중단되었습니다.';
      setErrorMessage(abortMsg);
      setResult(abortMsg);
      setChunkResult(abortMsg);
      return;
    }

    // 단일 업로드 (병렬로)
    let singleTimes = [];
    if (singleFile) {
      const singleUploadPromises = Array.from({ length: testCount }, async (_, i) => {
        // 중단 신호 확인
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        const requestId = requestIds[i];

        return new Promise((resolve) => {
          const formData = new FormData();
          formData.append('file', singleFile);
          customFields.forEach(f => { if (f.key) formData.append(f.key, f.value); });
          const xhr = new window.XMLHttpRequest();
          xhr.open('POST', apiOrigin.replace(/\/$/, '') + singleUploadPath);
          const headers = getHeadersWithRequestId(requestId);
          Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setTestProgresses(prev => {
                const newProgresses = [...prev];
                newProgresses[i] = percent;
                const avgProgress = Math.round(newProgresses.reduce((sum, p) => sum + p, 0) / newProgresses.length);
                setProgress(avgProgress);

                // 실시간 속도 계산
                if (singleFile && uploadStartTime) {
                  const processedBytes = (singleFile.size * avgProgress) / 100;
                  const speed = calculateSpeed(processedBytes, uploadStartTime);
                  setCurrentSpeed(speed);
                }

                return newProgresses;
              });
              // 전체 평균 프로그레스도 업데이트
              setTestProgresses(prev => {
                const newProgresses = [...prev];
                newProgresses[i] = percent;
                const avgProgress = Math.round(newProgresses.reduce((sum, p) => sum + p, 0) / newProgresses.length);
                setProgress(avgProgress);

                // 실시간 속도 계산
                if (singleFile && uploadStartTime) {
                  const processedBytes = (singleFile.size * avgProgress) / 100;
                  const speed = calculateSpeed(processedBytes, uploadStartTime);
                  setCurrentSpeed(speed);
                }

                return newProgresses;
              });
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
              // 실패 시 업로드 중단
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
            }
            resolve(elapsed);
          };
          xhr.onerror = () => {
            const errorMsg = '업로드 중 오류 발생';
            setErrorMessage(errorMsg);
            setResult(errorMsg);
            setProgress(0); // 프로그레스 바 초기화
            // 에러 발생 시 업로드 중단
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            resolve(null);
          };
          xhr.onabort = () => {
            const abortMsg = '업로드가 중단되었습니다.';
            setErrorMessage(abortMsg);
            setResult(abortMsg);
            setProgress(0); // 프로그레스 바 초기화
            resolve(null);
          };
          xhr.send(formData);

          // 중단 신호 감지 시 XHR 중단
          if (abortControllerRef.current?.signal.aborted) {
            xhr.abort();
          }
        });
      });

      const results = await Promise.all(singleUploadPromises);
      singleTimes = results.filter(time => time !== null);
    }
    setUploading(false);

    // 중단 신호 확인
    if (abortControllerRef.current?.signal.aborted) {
      setUploading(false);
      setChunkUploading(false);
      setBatchRunning(false);
      setProgress(0);
      setChunkProgress(0);
      setTestProgresses(Array(testCount).fill(0));
      setChunkTestProgresses(Array(testCount).fill(0));
      const abortMsg = '업로드가 중단되었습니다.';
      setErrorMessage(abortMsg);
      setResult(abortMsg);
      setChunkResult(abortMsg);
      return;
    }

    // 청크 업로드 (병렬로)
    let chunkTimes = [];
    if (chunkFile) {
      const chunkUploadPromises = Array.from({ length: testCount }, async (_, t) => {
        // 중단 신호 확인
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        // 발급받은 Request ID 사용
        const requestId = requestIds[t];

        const chunkSizeInBytes = convertMBToBytes(chunkSize); // MB를 byte로 변환
        const totalChunks = Math.ceil(chunkFile.size / chunkSizeInBytes);
        const fileId = `${chunkFile.name}-${chunkFile.size}-${chunkFile.lastModified}-${Date.now()}-${t}`;
        const uploadChunkUrl = apiOrigin.replace(/\/$/, '') + uploadChunkPath;
        const mergeChunksUrl = apiOrigin.replace(/\/$/, '') + mergeChunksPath;

        // 디버깅: 청크 설정 정보 출력
        console.log(`[DEBUG] 테스트 ${t + 1} - 설정된 청크 크기: ${chunkSize} MB (${chunkSizeInBytes.toLocaleString()} bytes), 파일 크기: ${chunkFile.size.toLocaleString()} bytes, 예상 청크 수: ${totalChunks}`);

        // 병렬 업로드 실행
        let mergeOk = false;
        const { chunkStart, chunkEnd, success: chunkUploadSuccess } = await parallelChunkUpload({
          file: chunkFile,
          chunkSizeInBytes: chunkSizeInBytes,
          fileId,
          totalChunks,
          uploadChunkUrl,
          setChunkProgress,
          parallelCount,
          abortController: abortControllerRef.current,
          getHeadersWithRequestId,
          requestId,
          testIndex: t
        });

        // 청크 업로드가 모두 성공했을 때만 병합 요청
        if (chunkUploadSuccess && chunkEnd && chunkStart) {
          try {
            const mergeRes = await fetch(mergeChunksUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getHeadersWithRequestId(requestId, { 'x-chunk-total': totalChunks }),
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
              const abortMsg = '업로드가 중단되었습니다.';
              setErrorMessage(abortMsg);
              setChunkResult(abortMsg);
              return null;
            }
            const errorMsg = '병합 요청 중 오류 발생';
            setErrorMessage(errorMsg);
            setChunkResult(errorMsg);
            // 에러 발생 시 전체 업로드 중단
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            return null;
          }

          // chunkEnd - chunkStart만 기록
          if (chunkStart && chunkEnd && mergeOk) {
            const elapsed = Math.round(chunkEnd - chunkStart);
            setChunkUploadTime(elapsed);
            return elapsed;
          }
        }
        return null;
      });

      const results = await Promise.all(chunkUploadPromises);
      chunkTimes = results.filter(time => time !== null);
    }
    setChunkUploading(false);
    setBatchRunning(false);

    // 중단된 경우 기록 저장하지 않음
    if (abortControllerRef.current?.signal.aborted) {
      setUploading(false);
      setChunkUploading(false);
      setProgress(0);
      setChunkProgress(0);
      setTestProgresses(Array(testCount).fill(0));
      setChunkTestProgresses(Array(testCount).fill(0));
      const abortMsg = '업로드가 중단되었습니다.';
      setErrorMessage(abortMsg);
      setResult(abortMsg);
      setChunkResult(abortMsg);
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
      requestIds: requestIds,
      chunkSize: convertMBToBytes(chunkSize), // MB를 byte로 변환하여 저장
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
  const [singleUploadPath, setSingleUploadPath] = useState('/v1/translation-re');
  const [uploadChunkPath, setUploadChunkPath] = useState('/v1/translation-re/chunk');
  const [mergeChunksPath, setMergeChunksPath] = useState('/v1/translation-re/merge');
  const [preflightPath, setPreflightPath] = useState('/v1/translation-re/preflight');

  // path 입력 필드 localStorage 불러오기
  useEffect(() => {
    const savedSingleUploadPath = localStorage.getItem('uploadTestSingleUploadPath');
    const savedUploadChunkPath = localStorage.getItem('uploadTestUploadChunkPath');
    const savedMergeChunksPath = localStorage.getItem('uploadTestMergeChunksPath');
    const savedPreflightPath = localStorage.getItem('uploadTestPreflightPath');
    if (savedSingleUploadPath) setSingleUploadPath(savedSingleUploadPath);
    if (savedUploadChunkPath) setUploadChunkPath(savedUploadChunkPath);
    if (savedMergeChunksPath) setMergeChunksPath(savedMergeChunksPath);
    if (savedPreflightPath) setPreflightPath(savedPreflightPath);
  }, []);

  // JWT 토큰 입력 핸들러
  const handleJwtTokenChange = (e) => {
    setJwtToken(e.target.value);
    localStorage.setItem('uploadTestJwtToken', e.target.value);
  };

  // Request ID 발급 Path 입력 핸들러
  const handleRequestIdPathChange = (e) => {
    setRequestIdPath(e.target.value);
    localStorage.setItem('uploadTestRequestIdPath', e.target.value);
  };

  // Request ID Body 필드 변경 핸들러
  const handleRequestIdBodyChange = (field, value) => {
    setRequestIdBody(prev => ({ ...prev, [field]: value }));
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
  const handlePreflightPathChange = (e) => {
    setPreflightPath(e.target.value);
    localStorage.setItem('uploadTestPreflightPath', e.target.value);
  };

  const fileInputRef = useRef();

  return (
    <div className="App" style={{ maxWidth: 1400, margin: '40px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      {/* 상단 통합 입력란과 측정 기록 */}
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
            gridTemplateRows: 'repeat(11, auto)',
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
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                총 {testCount}회 측정 실행
              </span>
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
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                최대 {parallelCount}개 동시 업로드
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '5/7', gridRow: '1/2' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>청크 크기 (MB)</span>
              <input
                type="number"
                value={chunkSize}
                onChange={handleChunkSizeChange}
                min={1}
                max={1000}
                step={1}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                = {convertMBToBytes(chunkSize).toLocaleString()} bytes
              </span>
            </div>
            {/* 2행: API 서버 Origin, 단일 업로드 Path, 청크 업로드 Path */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180, gridColumn: '1/3', gridRow: '2/3' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>API 서버 Origin</span>
              <input
                type="text"
                value={apiOrigin}
                onChange={handleApiOriginChange}
                placeholder="예: http://localhost:3001"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {apiOrigin ? '서버 주소가 설정됨' : '테스트 대상 서버 주소'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '3/5', gridRow: '2/3' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>단일 업로드 Path</span>
              <input
                type="text"
                value={singleUploadPath}
                onChange={handleSingleUploadPathChange}
                placeholder="예: /upload"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                Instruction 업로드 엔드포인트
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '5/7', gridRow: '2/3' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>청크 업로드 Path</span>
              <input
                type="text"
                value={uploadChunkPath}
                onChange={handleUploadChunkPathChange}
                placeholder="예: /upload-chunk"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                청크 단위 업로드 엔드포인트
              </span>
            </div>
            {/* 3행: Preflight Path, 청크 병합 Path, Request ID */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180, gridColumn: '1/3', gridRow: '3/4' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>Preflight Path</span>
              <input
                type="text"
                value={preflightPath}
                onChange={handlePreflightPathChange}
                placeholder="예: /preflight"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {preflightPath ? 'Preflight 검증 활성화' : '업로드 전 용량 검증 (선택사항)'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 120, gridColumn: '3/5', gridRow: '3/4' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>청크 병합 Path</span>
              <input
                type="text"
                value={mergeChunksPath}
                onChange={handleMergeChunksPathChange}
                placeholder="예: /merge-chunks"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
                required
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                청크 병합 요청 엔드포인트
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 180, gridColumn: '5/7', gridRow: '3/4' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>Request ID 발급 Path</span>
              <input
                type="text"
                value={requestIdPath}
                onChange={handleRequestIdPathChange}
                placeholder="예: /request-id"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {requestIdPath ? 'Request ID 발급 활성화' : '요청 추적 ID (선택사항)'}
              </span>
            </div>
            {/* 4행: JWT 토큰 (전체 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gridColumn: '1/7', gridRow: '4/5' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>JWT 토큰 (Bearer)</span>
              <input
                type="text"
                value={jwtToken}
                onChange={handleJwtTokenChange}
                placeholder="JWT 토큰 입력"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 14, transition: 'border 0.2s', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
                onBlur={e => e.target.style.border = '1px solid #ccc'}
              />
              <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {jwtToken ? 'Bearer 토큰 설정됨' : '인증 토큰 (선택사항)'}
              </span>
            </div>
            {/* 5행: Request ID Body 입력 필드 (전체 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gridColumn: '1/7', gridRow: '5/6' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>Request ID 발급용 POST Body</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#666', height: '16px', lineHeight: '16px' }}>language</span>
                  <input
                    type="text"
                    value={requestIdBody.language}
                    onChange={e => handleRequestIdBodyChange('language', e.target.value)}
                    placeholder="KO"
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#666', height: '16px', lineHeight: '16px' }}>target_language</span>
                  <input
                    type="text"
                    value={requestIdBody.target_language.join(', ')}
                    onChange={e => handleRequestIdBodyChange('target_language', e.target.value.split(',').map(s => s.trim()))}
                    placeholder="EN"
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#666', height: '16px', lineHeight: '16px' }}>dir_name (자동 추출)</span>
                  <input
                    type="text"
                    value={requestIdBody.dir_name}
                    onChange={e => handleRequestIdBodyChange('dir_name', e.target.value)}
                    placeholder="파일 선택 시 자동 설정"
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed', boxSizing: 'border-box' }}
                    readOnly={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#666', height: '16px', lineHeight: '16px' }}>ext (자동 추출)</span>
                  <input
                    type="text"
                    value={requestIdBody.ext}
                    onChange={e => handleRequestIdBodyChange('ext', e.target.value)}
                    placeholder="파일 선택 시 자동 설정"
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, backgroundColor: '#f8f9fa', color: '#666', cursor: 'not-allowed', boxSizing: 'border-box' }}
                    readOnly={true}
                  />
                </div>
              </div>
            </div>
            {/* 6행: Instruction 업로드 파일 (3 span) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gridColumn: '1/4',
              gridRow: '6/7',
              border: singleFile ? '2px solid #1976d2' : '2px solid #e0e0e0',
              borderRadius: 12,
              padding: '20px',
              backgroundColor: singleFile ? '#f0f8ff' : '#fafafa',
              minHeight: 120,
              transition: 'border-color 0.2s, background-color 0.2s'
            }}>
              <span style={{ fontSize: 15, marginBottom: 16, fontWeight: 500, color: singleFile ? '#1976d2' : '#333', textAlign: 'center' }}>Instruction 업로드 파일</span>
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
                    background: singleFile ? '#388e3c' : '#1976d2',
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
                  onMouseOver={e => e.target.style.background = singleFile ? '#2e7d32' : '#1565c0'}
                  onMouseOut={e => e.target.style.background = singleFile ? '#388e3c' : '#1976d2'}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M16.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" /><path stroke="#fff" strokeWidth="1.5" d="M12 16.5V19m-7 1.5h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.28a2 2 0 0 1-1.42-.59l-2.43-2.43a2 2 0 0 0-1.42-.58h-2.72a2 2 0 0 0-1.42.58l-2.43 2.43A2 2 0 0 1 4.28 9H3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Z" /></svg>
                  {singleFile ? '파일 변경' : '파일 선택'}
                </button>
                <div style={{ minHeight: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {singleFile && (
                    <span style={{ fontSize: 13, color: '#1976d2', fontWeight: 500, wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%' }}>{singleFile.name}</span>
                  )}
                </div>
              </div>
            </div>
            {/* 6행: 청크 업로드 파일 (3 span) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gridColumn: '4/7',
              gridRow: '6/7',
              border: chunkFile ? '2px solid #1976d2' : '2px solid #e0e0e0',
              borderRadius: 12,
              padding: '20px',
              backgroundColor: chunkFile ? '#f0f8ff' : '#fafafa',
              minHeight: 120,
              transition: 'border-color 0.2s, background-color 0.2s'
            }}>
              <span style={{ fontSize: 15, marginBottom: 16, fontWeight: 500, color: chunkFile ? '#1976d2' : '#333', textAlign: 'center' }}>청크 업로드 파일</span>
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
                    background: chunkFile ? '#388e3c' : '#1976d2',
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
                  onMouseOver={e => e.target.style.background = chunkFile ? '#2e7d32' : '#1565c0'}
                  onMouseOut={e => e.target.style.background = chunkFile ? '#388e3c' : '#1976d2'}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M16.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" /><path stroke="#fff" strokeWidth="1.5" d="M12 16.5V19m-7 1.5h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.28a2 2 0 0 1-1.42-.59l-2.43-2.43a2 2 0 0 0-1.42-.58h-2.72a2 2 0 0 0-1.42.58l-2.43 2.43A2 2 0 0 1 4.28 9H3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Z" /></svg>
                  {chunkFile ? '파일 변경' : '파일 선택'}
                </button>
                <div style={{ minHeight: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {chunkFile && (
                    <span style={{ fontSize: 13, color: '#1976d2', fontWeight: 500, wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%' }}>{chunkFile.name}</span>
                  )}
                </div>
              </div>
            </div>
            {/* 7행: 커스텀 FormData 필드 (3 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gridColumn: '1/4', gridRow: '7/8' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>커스텀 FormData 필드 (옵션)</span>
              <div style={{ width: '100%' }}>
                {customFields.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="key"
                      value={f.key}
                      onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }}
                    />
                    <span style={{ fontWeight: 500, color: '#888', fontSize: 12 }}>=</span>
                    <input
                      type="text"
                      placeholder="value"
                      value={f.value}
                      onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }}
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
            {/* 7행: 커스텀 헤더 (3 span) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gridColumn: '4/7', gridRow: '7/8' }}>
              <span style={{ fontSize: 15, marginBottom: 6, fontWeight: 500, color: '#333' }}>커스텀 헤더 (옵션)</span>
              <div style={{ width: '100%' }}>
                {customHeaders.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="key"
                      value={h.key}
                      onChange={e => handleCustomHeaderChange(idx, 'key', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }}
                    />
                    <span style={{ fontWeight: 500, color: '#888', fontSize: 12 }}>=</span>
                    <input
                      type="text"
                      placeholder="value"
                      value={h.value}
                      onChange={e => handleCustomHeaderChange(idx, 'value', e.target.value)}
                      style={{ width: '35%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' }}
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
            {/* 8행: 버튼들 */}
            <div style={{ gridColumn: '1/3', gridRow: '8/9', display: 'flex', alignItems: 'end' }}>
              <button
                onClick={handleBatchTest}
                disabled={batchRunning || !singleFile || !chunkFile || !apiOrigin}
                style={{
                  padding: '14px 24px',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 8,
                  background: batchRunning ? '#bdbdbd' : !singleFile || !chunkFile || !apiOrigin ? '#e0e0e0' : '#1976d2',
                  color: '#fff',
                  border: 'none',
                  boxShadow: batchRunning || !singleFile || !chunkFile || !apiOrigin ? 'none' : '0 2px 8px 0 rgba(25,118,210,0.08)',
                  cursor: batchRunning || !singleFile || !chunkFile || !apiOrigin ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  width: '100%',
                  minWidth: 120,
                  marginLeft: 0,
                }}
                onMouseOver={e => {
                  if (!batchRunning && singleFile && chunkFile && apiOrigin) {
                    e.target.style.background = '#1565c0';
                  }
                }}
                onMouseOut={e => {
                  if (!batchRunning && singleFile && chunkFile && apiOrigin) {
                    e.target.style.background = '#1976d2';
                  }
                }}
                title={
                  !apiOrigin ? 'API 서버 Origin을 입력해주세요.' :
                    !singleFile ? 'Instruction 업로드 파일을 선택해주세요.' :
                      !chunkFile ? '청크 업로드 파일을 선택해주세요.' :
                        batchRunning ? '측정이 진행 중입니다.' :
                          '측정을 시작합니다.'
                }
              >
                {batchRunning ? '측정 중...' : '측정 시작'}
              </button>
            </div>
            <div style={{ gridColumn: '3/5', gridRow: '8/9', display: 'flex', alignItems: 'end' }}>
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
            <div style={{ gridColumn: '5/7', gridRow: '8/9', display: 'flex', alignItems: 'end' }}>
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

        {/* 측정 기록 */}
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
            📊 측정 기록
          </h2>
          {history.length > 0 ? (
            <div style={{
              maxHeight: '70vh',
              overflowY: 'auto'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#e3eafc', color: '#1976d2' }}>
                      <th style={{ padding: 8, border: '1px solid #e3eafc', fontWeight: 700, fontSize: 12 }}>날짜</th>
                      <th style={{ padding: 8, border: '1px solid #e3eafc', fontWeight: 700, fontSize: 12 }}>청크 파일 크기</th>
                      <th style={{ padding: 8, border: '1px solid #e3eafc', fontWeight: 700, fontSize: 12 }}>응답 평균(s)</th>
                      <th style={{ padding: 8, border: '1px solid #e3eafc', fontWeight: 700, fontSize: 12 }}>Request ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((h, i) => {
                      // 파일 크기를 적절한 단위로 변환하는 함수
                      const formatFileSize = (bytes) => {
                        if (bytes === 0) return '0 B';
                        const k = 1024;
                        const sizes = ['B', 'KB', 'MB', 'GB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                      };

                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafd' : '#fff', transition: 'background 0.2s' }}>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', fontSize: 11 }}>{h.date}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', fontSize: 11 }}>{formatFileSize(h.chunkFileSize)}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', fontSize: 11 }}>{h.avgChunk ? (h.avgChunk / 1000).toFixed(2) : '-'}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', fontSize: 11, maxWidth: 120, whiteSpace: 'pre-wrap' }}>
                            {h.requestIds && h.requestIds.length > 0 ? h.requestIds.join('\n') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#666',
              textAlign: 'center',
              padding: '20px 0'
            }}>
              측정 기록이 없습니다.<br />
              측정을 실행하면 여기에 기록이 표시됩니다.
            </div>
          )}
        </div>
      </div>
      {/* 결과/진행률 영역 */}
      {/* 단일 업로드 결과 */}
      {uploading && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>Instruction 업로드 진행률</div>

            {/* 디버깅 정보 추가 */}
            {singleFile && (
              <div style={{
                background: '#f0f8ff',
                border: '1px solid #1976d2',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 13
              }}>
                <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4 }}>🔧 Instruction 업로드 정보</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: 12 }}>
                  <div><strong>파일 크기:</strong> {convertBytesToMB(singleFile.size)} MB ({singleFile.size.toLocaleString()} bytes)</div>
                  <div><strong>업로드 방식:</strong> 단일 파일 업로드</div>
                  <div><strong>테스트 횟수:</strong> {testCount}회</div>
                  <div><strong>병렬 처리:</strong> {testCount > 1 ? '동시 실행' : '순차 실행'}</div>
                </div>

                {/* 고급 지표 추가 */}
                {progress > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e3eafc' }}>
                    <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 6 }}>📊 실시간 성능 지표</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: 11 }}>
                      <div>
                        <strong>처리된 데이터:</strong> {convertBytesToMB((singleFile.size * progress) / 100)} MB
                      </div>
                      <div>
                        <strong>남은 데이터:</strong> {convertBytesToMB((singleFile.size * (100 - progress)) / 100)} MB
                      </div>
                      <div>
                        <strong>완료된 테스트:</strong> {Math.floor((testCount * progress) / 100)} / {testCount}회
                      </div>
                      <div>
                        <strong>예상 속도:</strong> {formatSpeed(currentSpeed)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 전체 평균 프로그레스 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#666', marginBottom: 4 }}>전체 평균</div>
              <div style={{ height: 18, background: '#e3eafc', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px 0 rgba(25,118,210,0.07)' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)', transition: 'width 0.2s' }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 14, color: '#1976d2', fontWeight: 500 }}>{progress}%</div>
            </div>
            {/* 각 테스트별 프로그레스 */}
            {testCount > 1 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#666', marginBottom: 8 }}>개별 테스트</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {testProgresses.map((testProgress, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 }}>테스트 {index + 1}</div>
                      <div style={{ height: 12, background: '#e3eafc', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${testProgress}%`, height: '100%', background: 'linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)', transition: 'width 0.2s' }} />
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12, color: '#1976d2', fontWeight: 500 }}>{testProgress}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {uploadTime !== null && (
        <div style={{ marginTop: 24, fontWeight: 'bold', fontSize: 17, color: '#1976d2' }}>
          Instruction 업로드 소요 시간: {(uploadTime / 1000).toFixed(2)} s
        </div>
      )}
      {errorMessage && (
        <div style={{ marginTop: 16, color: '#d32f2f', fontWeight: 600, fontSize: 16 }}>
          {errorMessage}
        </div>
      )}
      {result && !errorMessage && (
        <div style={{ marginTop: 16, color: result.includes('성공') ? '#388e3c' : '#d32f2f', fontWeight: 600, fontSize: 16 }}>
          {result}
        </div>
      )}
      {/* 청크 업로드 결과 */}
      {chunkUploading && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>청크 업로드 진행률</div>

            {/* 디버깅 정보 추가 */}
            {chunkFile && (
              <div style={{
                background: '#f0f8ff',
                border: '1px solid #1976d2',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 13
              }}>
                <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 4 }}>🔧 청크 설정 정보</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: 12 }}>
                  <div><strong>파일 크기:</strong> {convertBytesToMB(chunkFile.size)} MB ({chunkFile.size.toLocaleString()} bytes)</div>
                  <div><strong>청크 크기:</strong> {chunkSize} MB ({convertMBToBytes(chunkSize).toLocaleString()} bytes)</div>
                  <div><strong>예상 청크 수:</strong> {Math.ceil(chunkFile.size / convertMBToBytes(chunkSize))}개</div>
                  <div><strong>병렬 업로드:</strong> {parallelCount}개</div>
                </div>

                {/* 고급 지표 추가 */}
                {chunkProgress > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e3eafc' }}>
                    <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 6 }}>📊 실시간 성능 지표</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: 11 }}>
                      <div>
                        <strong>처리된 데이터:</strong> {convertBytesToMB((chunkFile.size * chunkProgress) / 100)} MB
                      </div>
                      <div>
                        <strong>남은 데이터:</strong> {convertBytesToMB((chunkFile.size * (100 - chunkProgress)) / 100)} MB
                      </div>
                      <div>
                        <strong>완료된 청크:</strong> {Math.floor((Math.ceil(chunkFile.size / convertMBToBytes(chunkSize)) * chunkProgress) / 100)} / {Math.ceil(chunkFile.size / convertMBToBytes(chunkSize))}개
                      </div>
                      <div>
                        <strong>예상 속도:</strong> {formatSpeed(chunkCurrentSpeed)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 전체 평균 프로그레스 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#666', marginBottom: 4 }}>전체 평균</div>
              <div style={{ height: 18, background: '#e3eafc', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px 0 rgba(25,118,210,0.07)' }}>
                <div style={{ width: `${chunkProgress}%`, height: '100%', background: 'linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)', transition: 'width 0.2s' }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 14, color: '#1976d2', fontWeight: 500 }}>{chunkProgress}%</div>
            </div>
            {/* 각 테스트별 프로그레스 */}
            {testCount > 1 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#666', marginBottom: 8 }}>개별 테스트</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {chunkTestProgresses.map((testProgress, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 4 }}>테스트 {index + 1}</div>
                      <div style={{ height: 12, background: '#e3eafc', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${testProgress}%`, height: '100%', background: 'linear-gradient(90deg,#1976d2 60%,#42a5f5 100%)', transition: 'width 0.2s' }} />
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12, color: '#1976d2', fontWeight: 500 }}>{testProgress}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {chunkUploadTime !== null && (
        <div style={{ marginTop: 24, fontWeight: 'bold', fontSize: 17, color: '#1976d2' }}>
          청크 업로드 소요 시간: {(chunkUploadTime / 1000).toFixed(2)} s
        </div>
      )}
      {chunkResult && (
        <div style={{ marginTop: 16, color: chunkResult.includes('성공') ? '#388e3c' : '#d32f2f', fontWeight: 600, fontSize: 16 }}>
          {chunkResult}
        </div>
      )}

    </div>
  );
}

export default App;
