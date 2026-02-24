/**
 * 영수증 자동화 - Cloudflare Workers 백엔드
 * R2 버킷을 사용하여 파일 저장/조회
 * 프로젝트별 데이터 분리 지원
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 헤더
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ===== 프로젝트 관리 API =====
      
      // 프로젝트 목록 조회
      if (path === '/api/projects' && request.method === 'GET') {
        return await handleGetProjects(env, corsHeaders);
      }
      
      // 프로젝트 생성
      if (path === '/api/projects' && request.method === 'POST') {
        return await handleCreateProject(request, env, corsHeaders);
      }
      
      // 프로젝트 삭제
      if (path.startsWith('/api/projects/') && request.method === 'DELETE') {
        const projectId = decodeURIComponent(path.replace('/api/projects/', ''));
        return await handleDeleteProject(projectId, env, corsHeaders);
      }

      // ===== 프로젝트별 파일 API =====
      
      // 파일 스캔 (프로젝트별)
      if (path.startsWith('/api/project/') && path.endsWith('/scan') && request.method === 'GET') {
        const projectId = path.replace('/api/project/', '').replace('/scan', '');
        return await handleScan(projectId, env, corsHeaders);
      }
      
      // 파일 업로드 (프로젝트별)
      if (path.startsWith('/api/project/') && path.endsWith('/upload') && request.method === 'POST') {
        const projectId = path.replace('/api/project/', '').replace('/upload', '');
        return await handleUpload(projectId, request, env, corsHeaders);
      }
      
      // 영수증 이미지 조회 (프로젝트별)
      if (path.startsWith('/api/project/') && path.includes('/receipt/') && request.method === 'GET') {
        const parts = path.replace('/api/project/', '').split('/receipt/');
        const projectId = parts[0];
        const filename = decodeURIComponent(parts[1]);
        return await handleGetReceipt(projectId, filename, env, corsHeaders);
      }
      
      // 분석 결과 조회 (프로젝트별)
      if (path.startsWith('/api/project/') && path.endsWith('/results') && request.method === 'GET') {
        const projectId = path.replace('/api/project/', '').replace('/results', '');
        return await handleGetResults(projectId, env, corsHeaders);
      }
      
      // 특정 파일 분석 결과 조회 (프로젝트별)
      if (path.startsWith('/api/project/') && path.includes('/result/') && request.method === 'GET') {
        const parts = path.replace('/api/project/', '').split('/result/');
        const projectId = parts[0];
        const fileId = decodeURIComponent(parts[1]);
        return await handleGetResult(projectId, fileId, env, corsHeaders);
      }
      
      // 분석 결과 저장 (프로젝트별)
      if (path.startsWith('/api/project/') && path.endsWith('/results') && request.method === 'POST') {
        const projectId = path.replace('/api/project/', '').replace('/results', '');
        return await handleSaveResults(projectId, request, env, corsHeaders);
      }
      
      // 파일 저장 (프로젝트별)
      if (path.startsWith('/api/project/') && path.endsWith('/save') && request.method === 'POST') {
        const projectId = path.replace('/api/project/', '').replace('/save', '');
        return await handleSaveFiles(projectId, request, env, corsHeaders);
      }
      
      // 파일 삭제 (프로젝트별)
      if (path.startsWith('/api/project/') && path.includes('/delete/') && request.method === 'DELETE') {
        const parts = path.replace('/api/project/', '').split('/delete/');
        const projectId = parts[0];
        const filename = decodeURIComponent(parts[1]);
        return await handleDelete(projectId, filename, env, corsHeaders);
      }

      // 정적 파일은 assets에서 자동 서빙됨
      return new Response('Not Found', { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// ===== 프로젝트 관리 =====

// 프로젝트 목록 조회
async function handleGetProjects(env, corsHeaders) {
  const object = await env.RECEIPTS_BUCKET.get('projects.json');
  
  let projects = [];
  if (object) {
    projects = JSON.parse(await object.text());
  }
  
  // 각 프로젝트의 파일 수 계산
  for (const project of projects) {
    const list = await env.RECEIPTS_BUCKET.list({ prefix: `projects/${project.id}/uploads/` });
    project.fileCount = list.objects.filter(obj => !obj.key.endsWith('/')).length;
  }
  
  return new Response(JSON.stringify(projects), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 프로젝트 생성
async function handleCreateProject(request, env, corsHeaders) {
  const { name, description } = await request.json();
  
  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: '프로젝트 이름을 입력해주세요' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // 기존 프로젝트 목록 불러오기
  let projects = [];
  const object = await env.RECEIPTS_BUCKET.get('projects.json');
  if (object) {
    projects = JSON.parse(await object.text());
  }
  
  // 새 프로젝트 ID 생성 (타임스탬프 기반)
  const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  const newProject = {
    id,
    name: name.trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString(),
    fileCount: 0,
  };
  
  projects.unshift(newProject);
  
  // 저장
  await env.RECEIPTS_BUCKET.put('projects.json', JSON.stringify(projects, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
  
  return new Response(JSON.stringify(newProject), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 프로젝트 삭제
async function handleDeleteProject(projectId, env, corsHeaders) {
  // 프로젝트 내 모든 파일 삭제
  const prefix = `projects/${projectId}/`;
  let cursor = undefined;
  
  do {
    const list = await env.RECEIPTS_BUCKET.list({ prefix, cursor });
    
    for (const obj of list.objects) {
      await env.RECEIPTS_BUCKET.delete(obj.key);
    }
    
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  
  // 프로젝트 목록에서 제거
  let projects = [];
  const object = await env.RECEIPTS_BUCKET.get('projects.json');
  if (object) {
    projects = JSON.parse(await object.text());
  }
  
  projects = projects.filter(p => p.id !== projectId);
  
  await env.RECEIPTS_BUCKET.put('projects.json', JSON.stringify(projects, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ===== 프로젝트별 파일 관리 =====

// 업로드된 파일 목록 조회
async function handleScan(projectId, env, corsHeaders) {
  const prefix = `projects/${projectId}/uploads/`;
  const list = await env.RECEIPTS_BUCKET.list({ prefix });
  
  const files = list.objects
    .filter(obj => !obj.key.endsWith('/'))
    .map(obj => {
      const filename = obj.key.replace(prefix, '');
      const id = filename.replace(/\.[^/.]+$/, '');
      return {
        id,
        filename,
        original_name: filename,
        size: obj.size,
        uploaded: obj.uploaded,
      };
    })
    .sort((a, b) => a.filename.localeCompare(b.filename));

  return new Response(JSON.stringify({
    files,
    count: files.length,
    projectId,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 파일 업로드
async function handleUpload(projectId, request, env, corsHeaders) {
  const formData = await request.formData();
  const uploaded = [];
  const prefix = `projects/${projectId}/uploads/`;

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const filename = value.name;
      const arrayBuffer = await value.arrayBuffer();
      
      await env.RECEIPTS_BUCKET.put(`${prefix}${filename}`, arrayBuffer, {
        httpMetadata: {
          contentType: value.type,
        },
      });
      
      uploaded.push({
        filename,
        size: value.size,
        type: value.type,
      });
    }
  }

  return new Response(JSON.stringify({
    uploaded,
    count: uploaded.length,
    projectId,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 영수증 이미지 조회
async function handleGetReceipt(projectId, filename, env, corsHeaders) {
  const prefix = `projects/${projectId}/uploads/`;
  let object = await env.RECEIPTS_BUCKET.get(`${prefix}${filename}`);
  
  if (!object) {
    const list = await env.RECEIPTS_BUCKET.list({ prefix });
    const found = list.objects.find(obj => {
      const name = obj.key.replace(prefix, '');
      return name === filename || name.replace(/\.[^/.]+$/, '') === filename;
    });
    
    if (found) {
      object = await env.RECEIPTS_BUCKET.get(found.key);
    }
  }

  if (!object) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers(corsHeaders);
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
}

// 분석 결과 전체 조회
async function handleGetResults(projectId, env, corsHeaders) {
  const key = `projects/${projectId}/analysis_results.json`;
  const object = await env.RECEIPTS_BUCKET.get(key);
  
  if (!object) {
    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results = await object.text();
  return new Response(results, {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 특정 파일 분석 결과 조회
async function handleGetResult(projectId, fileId, env, corsHeaders) {
  const key = `projects/${projectId}/analysis_results.json`;
  const object = await env.RECEIPTS_BUCKET.get(key);
  
  if (!object) {
    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results = JSON.parse(await object.text());
  const result = results[fileId] || {};
  
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 분석 결과 저장
async function handleSaveResults(projectId, request, env, corsHeaders) {
  const newResults = await request.json();
  const key = `projects/${projectId}/analysis_results.json`;
  
  let existingResults = {};
  const object = await env.RECEIPTS_BUCKET.get(key);
  if (object) {
    existingResults = JSON.parse(await object.text());
  }
  
  const mergedResults = { ...existingResults, ...newResults };
  
  await env.RECEIPTS_BUCKET.put(key, JSON.stringify(mergedResults, null, 2), {
    httpMetadata: {
      contentType: 'application/json',
    },
  });

  return new Response(JSON.stringify({ success: true, count: Object.keys(mergedResults).length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 파일 저장 (이름 변경하여 output 폴더로)
async function handleSaveFiles(projectId, request, env, corsHeaders) {
  const { items } = await request.json();
  
  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ error: '저장할 항목이 없습니다' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const uploadPrefix = `projects/${projectId}/uploads/`;
  const outputPrefix = `projects/${projectId}/output/`;
  const saved = [];
  
  for (const item of items) {
    const { id, filename, date, time, merchant, amount, user_notes } = item;
    
    let sourceKey = `${uploadPrefix}${filename}`;
    let sourceObject = await env.RECEIPTS_BUCKET.get(sourceKey);
    
    if (!sourceObject) {
      const list = await env.RECEIPTS_BUCKET.list({ prefix: uploadPrefix });
      const found = list.objects.find(obj => {
        const name = obj.key.replace(uploadPrefix, '');
        return name.replace(/\.[^/.]+$/, '') === id;
      });
      
      if (found) {
        sourceKey = found.key;
        sourceObject = await env.RECEIPTS_BUCKET.get(sourceKey);
      }
    }
    
    if (!sourceObject) {
      saved.push({ original: filename, ok: false, error: '파일 없음' });
      continue;
    }

    const ext = sourceKey.split('.').pop().toLowerCase() || 'jpg';
    
    const safeDate = (date || '').trim() || '000000';
    const safeTime = (time || '').trim() || '000000';
    const safeMerchant = sanitizeFilename(merchant || '미입력');
    const safeAmount = (amount || '0').replace(/,/g, '');
    const safeNotes = sanitizeFilename(user_notes || '메모없음');
    
    let newName = `${safeDate}_${safeTime}_${safeMerchant}_${safeAmount}_${safeNotes}.${ext}`;
    let newKey = `${outputPrefix}${newName}`;
    
    let counter = 0;
    while (await env.RECEIPTS_BUCKET.head(newKey)) {
      counter++;
      const baseName = `${safeDate}_${safeTime}_${safeMerchant}_${safeAmount}_${safeNotes}_${counter}`;
      newName = `${baseName}.${ext}`;
      newKey = `${outputPrefix}${newName}`;
    }

    try {
      const data = await sourceObject.arrayBuffer();
      await env.RECEIPTS_BUCKET.put(newKey, data, {
        httpMetadata: sourceObject.httpMetadata,
      });
      
      saved.push({ original: filename, new_name: newName, ok: true });
    } catch (error) {
      saved.push({ original: filename, ok: false, error: error.message });
    }
  }

  return new Response(JSON.stringify({ 
    saved, 
    output_dir: `R2: projects/${projectId}/output/`,
    projectId,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 파일 삭제
async function handleDelete(projectId, filename, env, corsHeaders) {
  await env.RECEIPTS_BUCKET.delete(`projects/${projectId}/uploads/${filename}`);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 파일명 안전하게 변환
function sanitizeFilename(str) {
  return str
    .replace(/[\\/:*?"<>|]/g, '')
    .trim() || 'unknown';
}
